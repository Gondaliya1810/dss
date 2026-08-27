const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const multerS3 = require('multer-s3');
const nodemailer = require('nodemailer');
const dns = require('dns');
if (typeof dns.setDefaultResultOrder === 'function') {
    dns.setDefaultResultOrder('ipv4first');
}
require('dotenv').config();
const { supabase, Project, Lead, Client, Staff, Task, Package, Attendance, BrandLogo, Review, Chat } = require('./db');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Redirect any path ending with /dss to /login.html
app.use((req, res, next) => {
    const cleanPath = req.path.replace(/\/$/, ''); // Remove trailing slash
    if (cleanPath.endsWith('/dss')) {
        return res.redirect('/login.html');
    }
    next();
});

// Function to initialize and verify SMTP transporter on startup (forces IPv4)
async function verifySmtpOnStartup() {
    if (process.env.RESEND_API_KEY) {
        console.log('Resend API key is configured. Emails will be sent via Resend API.');
        return;
    }

    if (!process.env.SMTP_USER) {
        console.warn('Neither RESEND_API_KEY nor SMTP_USER is defined. Staff password recovery emails will fail.');
        return;
    }

    const smtpHost = process.env.SMTP_HOST || 'smtp.hostinger.com';
    let resolvedHost = smtpHost;

    try {
        const dns = require('dns').promises;
        const addresses = await dns.resolve4(smtpHost);
        if (addresses && addresses.length > 0) {
            resolvedHost = addresses[0];
            console.log(`[Startup] Resolved SMTP Host ${smtpHost} to IPv4: ${resolvedHost}`);
        }
    } catch (dnsErr) {
        console.warn(`[Startup] DNS resolve4 failed for ${smtpHost}, using original host name:`, dnsErr.message);
    }

    const testTransporter = nodemailer.createTransport({
        host: resolvedHost,
        port: parseInt(process.env.SMTP_PORT) || 465,
        secure: parseInt(process.env.SMTP_PORT) === 465 || !process.env.SMTP_PORT,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        },
        connectionTimeout: 15000,
        tls: {
            rejectUnauthorized: false,
            servername: smtpHost
        }
    });

    testTransporter.verify(function (error, success) {
        if (error) {
            console.error('SMTP Connection Validation Failed:', error.message);
        } else {
            console.log('SMTP Connection Success: Server is ready to send emails.');
        }
    });
}

verifySmtpOnStartup();



// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Cloudflare R2 S3 Client
const useR2 = process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY;
let s3;
let storage;

if (useR2) {
    s3 = new S3Client({
        region: 'auto',
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        },
    });

    storage = multerS3({
        s3: s3,
        bucket: process.env.R2_BUCKET_NAME || 'dss-uploads',
        key: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            cb(null, uniqueSuffix + path.extname(file.originalname));
        }
    });
} else {
    storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            cb(null, uniqueSuffix + path.extname(file.originalname));
        }
    });
}

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit for high-res graphics/videos
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|webm/;
        const mimeType = allowedTypes.test(file.mimetype);
        const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        if (mimeType && extName) {
            return cb(null, true);
        }
        cb(new Error('Only images (jpg, png, gif, webp) and videos (mp4, webm) are allowed!'));
    }
});

// Helper to construct public URL / relative path
const getFileUrl = (file) => {
    if (!file) return null;
    if (useR2) {
        const publicUrl = process.env.R2_PUBLIC_URL || '';
        const prefix = publicUrl.endsWith('/') ? publicUrl : publicUrl + '/';
        return prefix + file.key;
    }
    return '/uploads/' + file.filename;
};

// Helper to delete file from local disk or R2 bucket
const deleteFile = async (fileOrUrl) => {
    if (!fileOrUrl) return;

    let filename = typeof fileOrUrl === 'object' ? (fileOrUrl.key || fileOrUrl.filename) : null;
    let localPath = typeof fileOrUrl === 'object' ? fileOrUrl.path : null;

    if (typeof fileOrUrl === 'string') {
        if (fileOrUrl.startsWith('http://') || fileOrUrl.startsWith('https://')) {
            const parts = fileOrUrl.split('/');
            filename = parts[parts.length - 1];
        } else {
            const parts = fileOrUrl.split('/');
            filename = parts[parts.length - 1];
            localPath = path.join(__dirname, 'public', 'uploads', filename);
        }
    }

    if (useR2 && filename) {
        try {
            await s3.send(new DeleteObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME || 'dss-uploads',
                Key: filename
            }));
            console.log('Deleted from Cloudflare R2:', filename);
        } catch (err) {
            console.error('Error deleting from R2:', err);
        }
    }

    if (localPath) {
        try {
            if (fs.existsSync(localPath)) {
                fs.unlinkSync(localPath);
                console.log('Deleted from local disk:', localPath);
            }
        } catch (err) {
            console.error('Error deleting from local disk:', err);
        }
    }
};

// Note: Local JSON file helpers are replaced by Mongoose db models.

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));


// API Endpoint for Contact Form Submission
app.post('/api/contact', async (req, res) => {
    const { name, email, phone, service, message } = req.body;

    // Simple validation
    if (!name || !email || !phone || !message) {
        return res.status(400).json({ 
            success: false, 
            message: 'Please fill in all required fields (Name, Email, Phone, Message).' 
        });
    }

    try {
        const leadData = new Lead({
            id: 'lead-' + Date.now() + '-' + Math.round(Math.random() * 1e9),
            timestamp: new Date(),
            name,
            email,
            phone: phone || 'N/A',
            service: service || 'Not specified',
            message,
            status: 'pending'
        });

        await leadData.save();

        // Send successful response
        return res.status(200).json({
            success: true,
            message: 'Thank you! Your message has been received. Our team will contact you shortly.'
        });
    } catch (error) {
        console.error('Error saving lead details:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while saving your message. Please try again.'
        });
    }
});

// Admin Login API
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    // Basic credentials verification
    const adminUser = process.env.ADMIN_USER || 'admin';
    const adminPass = process.env.ADMIN_PASS || 'admin123';

    if (username === adminUser && password === adminPass) {
        return res.status(200).json({ 
            success: true, 
            token: 'dss-token-' + Buffer.from(username).toString('base64'),
            message: 'Login successful' 
        });
    } else {
        return res.status(401).json({ 
            success: false, 
            message: 'Invalid username or password!' 
        });
    }
});

// GET all contact leads
app.get('/api/admin/leads', async (req, res) => {
    try {
        // Validate auth header (token)
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer dss-token-')) {
            return res.status(403).json({ success: false, message: 'Unauthorized access.' });
        }

        const leads = await Lead.find({}).sort({ timestamp: -1 });
        return res.status(200).json({ success: true, leads });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

// DELETE a lead
app.delete('/api/admin/leads/:id', async (req, res) => {
    try {
        // Validate auth header (token)
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer dss-token-')) {
            return res.status(403).json({ success: false, message: 'Unauthorized access.' });
        }

        const { id } = req.params;
        const result = await Lead.deleteOne({ id });

        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, message: 'Lead not found.' });
        }

        return res.status(200).json({ success: true, message: 'Lead deleted successfully!' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

// UPDATE lead status
app.put('/api/admin/leads/:id/status', async (req, res) => {
    try {
        // Validate auth header (token)
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer dss-token-')) {
            return res.status(403).json({ success: false, message: 'Unauthorized access.' });
        }

        const { id } = req.params;
        const { status } = req.body;

        if (!status || !['pending', 'contacted', 'spam'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status value. Must be pending, contacted, or spam.' });
        }

        const updatedLead = await Lead.findOneAndUpdate(
            { id },
            { status },
            { new: true }
        );

        if (!updatedLead) {
            return res.status(404).json({ success: false, message: 'Lead not found.' });
        }

        return res.status(200).json({ 
            success: true, 
            message: `Lead status updated to ${status} successfully!`,
            lead: updatedLead
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

// GET all projects
app.get('/api/projects', async (req, res) => {
    try {
        const projects = await Project.find({}).sort({ createdAt: -1 });
        return res.status(200).json({ success: true, projects });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

// POST upload new project
app.post('/api/projects', upload.fields([{ name: 'workFiles', maxCount: 15 }, { name: 'thumbnailFile', maxCount: 1 }]), async (req, res) => {
    const workFiles = req.files && req.files['workFiles'] ? req.files['workFiles'] : [];
    const thumbnailFile = req.files && req.files['thumbnailFile'] ? req.files['thumbnailFile'][0] : null;

    try {
        const { title, category, description } = req.body;
        
        if (!title || !category || workFiles.length === 0) {
            // Delete uploaded files if validation fails
            for (const file of workFiles) { await deleteFile(file); }
            if (thumbnailFile) { await deleteFile(thumbnailFile); }
            return res.status(400).json({ 
                success: false, 
                message: 'Title, category, and at least one media file are required.' 
            });
        }

        // Validate auth header (token)
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer dss-token-')) {
            // Delete uploaded files if unauthorized
            for (const file of workFiles) { await deleteFile(file); }
            if (thumbnailFile) { await deleteFile(thumbnailFile); }
            return res.status(403).json({ success: false, message: 'Unauthorized access.' });
        }

        const mediaPaths = workFiles.map(file => getFileUrl(file));
        const mediaTypes = workFiles.map(file => file.mimetype.startsWith('video/') ? 'video' : 'image');

        const newProject = new Project({
            id: 'proj-' + Date.now(),
            title,
            category,
            description: description || '',
            imagePath: mediaPaths[0],
            fileType: mediaTypes[0],
            mediaPaths,
            mediaTypes,
            thumbnailPath: thumbnailFile ? getFileUrl(thumbnailFile) : null,
            createdAt: new Date()
        });

        await newProject.save();

        return res.status(201).json({ 
            success: true, 
            project: newProject,
            message: 'Project uploaded successfully!' 
        });
    } catch (error) {
        console.error('Upload error:', error);
        for (const file of workFiles) { await deleteFile(file); }
        if (thumbnailFile) { await deleteFile(thumbnailFile); }
        return res.status(500).json({ success: false, message: error.message });
    }
});

// PUT update a project
app.put('/api/projects/:id', upload.fields([{ name: 'workFiles', maxCount: 15 }, { name: 'thumbnailFile', maxCount: 1 }]), async (req, res) => {
    const workFiles = req.files && req.files['workFiles'] ? req.files['workFiles'] : [];
    const thumbnailFile = req.files && req.files['thumbnailFile'] ? req.files['thumbnailFile'][0] : null;

    try {
        const { id } = req.params;
        const { title, category, description } = req.body;
        
        let keepMediaPaths = [];
        if (req.body.keepMediaPaths) {
            try {
                keepMediaPaths = JSON.parse(req.body.keepMediaPaths);
            } catch(e) {
                keepMediaPaths = [req.body.keepMediaPaths];
            }
        }

        // Validate auth header (token)
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer dss-token-')) {
            for (const file of workFiles) { await deleteFile(file); }
            if (thumbnailFile) { await deleteFile(thumbnailFile); }
            return res.status(403).json({ success: false, message: 'Unauthorized access.' });
        }

        const project = await Project.findOne({ id });
        if (!project) {
            for (const file of workFiles) { await deleteFile(file); }
            if (thumbnailFile) { await deleteFile(thumbnailFile); }
            return res.status(404).json({ success: false, message: 'Project not found.' });
        }

        if (keepMediaPaths.length === 0 && workFiles.length === 0) {
            for (const file of workFiles) { await deleteFile(file); }
            if (thumbnailFile) { await deleteFile(thumbnailFile); }
            return res.status(400).json({ success: false, message: 'At least one media file is required.' });
        }

        // Delete removed files from disk/R2
        const currentMediaPaths = project.mediaPaths || [project.imagePath];
        const deletedMediaPaths = currentMediaPaths.filter(pathVal => !keepMediaPaths.includes(pathVal));
        
        for (const pathVal of deletedMediaPaths) {
            await deleteFile(pathVal);
        }

        // Compute new uploads
        const newMediaPaths = workFiles.map(file => getFileUrl(file));
        const newMediaTypes = workFiles.map(file => file.mimetype.startsWith('video/') ? 'video' : 'image');

        const updatedMediaPaths = [];
        const updatedMediaTypes = [];

        // Add kept files
        keepMediaPaths.forEach(pathVal => {
            const oldIndex = (project.mediaPaths || [project.imagePath]).indexOf(pathVal);
            const oldType = oldIndex !== -1 
                ? (project.mediaTypes || [project.fileType])[oldIndex] 
                : 'image';
            updatedMediaPaths.push(pathVal);
            updatedMediaTypes.push(oldType);
        });

        // Append new files
        newMediaPaths.forEach((pathVal, i) => {
            updatedMediaPaths.push(pathVal);
            updatedMediaTypes.push(newMediaTypes[i]);
        });

        // Handle thumbnail replacement
        let updatedThumbnailPath = project.thumbnailPath;
        if (thumbnailFile) {
            if (project.thumbnailPath) {
                await deleteFile(project.thumbnailPath);
            }
            updatedThumbnailPath = getFileUrl(thumbnailFile);
        }

        // Update project details
        project.title = title || project.title;
        project.category = category || project.category;
        project.description = description || '';
        project.mediaPaths = updatedMediaPaths;
        project.mediaTypes = updatedMediaTypes;
        project.imagePath = updatedMediaPaths[0];
        project.fileType = updatedMediaTypes[0];
        project.thumbnailPath = updatedThumbnailPath;

        await project.save();

        return res.status(200).json({ 
            success: true, 
            project,
            message: 'Project updated successfully!' 
        });
    } catch (error) {
        console.error('Update error:', error);
        for (const file of workFiles) { await deleteFile(file); }
        if (thumbnailFile) { await deleteFile(thumbnailFile); }
        return res.status(500).json({ success: false, message: error.message });
    }
});

// DELETE a project
app.delete('/api/projects/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Validate auth header (token)
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer dss-token-')) {
            return res.status(403).json({ success: false, message: 'Unauthorized access.' });
        }

        const project = await Project.findOne({ id });
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found.' });
        }

        // Remove media files
        if (project.mediaPaths && project.mediaPaths.length > 0) {
            for (const mediaPath of project.mediaPaths) {
                await deleteFile(mediaPath);
            }
        } else if (project.imagePath) {
            await deleteFile(project.imagePath);
        }

        // Remove thumbnail file if it exists
        if (project.thumbnailPath) {
            await deleteFile(project.thumbnailPath);
        }

        await Project.deleteOne({ id });

        return res.status(200).json({ success: true, message: 'Project deleted successfully!' });
    } catch (error) {
        console.error('Delete error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

// Auth validation helper
const validateAdminAuth = (req) => {
    const authHeader = req.headers.authorization;
    return authHeader && authHeader.startsWith('Bearer dss-token-');
};

function parseShiftStartTime(shiftTimeStr) {
    if (!shiftTimeStr) return null;
    const parts = shiftTimeStr.split('-');
    if (parts.length < 1) return null;
    
    const startPart = parts[0].trim(); // e.g. "02:00 PM"
    const match = startPart.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return null;
    
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const ampm = match[3].toUpperCase();
    
    if (ampm === 'PM' && hours !== 12) {
        hours += 12;
    } else if (ampm === 'AM' && hours === 12) {
        hours = 0;
    }
    
    return { hours, minutes };
}

// ------------------------------------------------------------------------
// TASK TRACKING API ENDPOINTS
// ------------------------------------------------------------------------

// Get all tasks
app.get('/api/tasks', async (req, res) => {
    if (!validateAdminAuth(req)) {
        return res.status(403).json({ success: false, message: 'Unauthorized access.' });
    }
    try {
        const tasks = await Task.find({}).sort({ createdAt: -1 });
        res.json({ success: true, tasks });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create task
app.post('/api/tasks', async (req, res) => {
    if (!validateAdminAuth(req)) {
        return res.status(403).json({ success: false, message: 'Unauthorized access.' });
    }
    const { title, client, assignedToId, deadline, priority, description } = req.body;
    if (!title || !client || !assignedToId || !deadline || !priority) {
        return res.status(400).json({ success: false, message: 'Missing required task fields.' });
    }

    try {
        const staff = await Staff.findOne({ id: assignedToId });
        if (!staff) {
            return res.status(400).json({ success: false, message: 'Assigned staff member not found.' });
        }

        const newTask = new Task({
            id: 'task-' + Date.now(),
            title,
            client,
            assignedTo: {
                id: staff.id,
                name: staff.name,
                role: staff.role,
                avatarColor: staff.avatarColor
            },
            deadline,
            status: 'pending',
            priority,
            description: description || '',
            createdAt: new Date()
        });

        await newTask.save();

        // Auto-create client if it doesn't exist
        const clientExists = await Client.findOne({ name: { $regex: new RegExp(`^${client}$`, 'i') } });
        if (!clientExists) {
            const newClient = new Client({
                id: 'client-' + Date.now(),
                name: client,
                email: ''
            });
            await newClient.save();
        }

        res.status(201).json({ success: true, task: newTask });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update task status / details
app.put('/api/tasks/:id', async (req, res) => {
    if (!validateAdminAuth(req)) {
        return res.status(403).json({ success: false, message: 'Unauthorized access.' });
    }
    const { id } = req.params;
    const { status, title, client, assignedToId, deadline, priority, description } = req.body;

    try {
        const task = await Task.findOne({ id });
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found.' });
        }

        if (status) {
            const validStatuses = ['pending', 'in_progress', 'under_review', 'completed'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ success: false, message: 'Invalid status value.' });
            }
            task.status = status;
        }

        if (title) task.title = title;
        if (client) task.client = client;
        if (deadline) task.deadline = deadline;
        if (priority) task.priority = priority;
        if (description !== undefined) task.description = description;

        if (assignedToId) {
            const staff = await Staff.findOne({ id: assignedToId });
            if (staff) {
                task.assignedTo = {
                    id: staff.id,
                    name: staff.name,
                    role: staff.role,
                    avatarColor: staff.avatarColor
                };
            }
        }

        await task.save();
        res.json({ success: true, task });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete task
app.delete('/api/tasks/:id', async (req, res) => {
    if (!validateAdminAuth(req)) {
        return res.status(403).json({ success: false, message: 'Unauthorized access.' });
    }
    const { id } = req.params;
    try {
        const result = await Task.deleteOne({ id });
        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, message: 'Task not found.' });
        }
        res.json({ success: true, message: 'Task deleted successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Staff Change Password Route
app.put('/api/staff/change-password', async (req, res) => {
    const staff = await validateStaffAuth(req);
    if (!staff) {
        return res.status(403).json({ success: false, message: 'Unauthorized staff access.' });
    }
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
        return res.status(400).json({ success: false, message: 'Current password and new password are required.' });
    }
    try {
        const staffObj = await Staff.findOne({ id: staff.id });
        if (staffObj.password !== oldPassword) {
            return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
        }
        staffObj.password = newPassword;
        await staffObj.save();
        res.json({ success: true, message: 'Password updated successfully!' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET current staff member's profile
app.get('/api/staff/profile', async (req, res) => {
    const staff = await validateStaffAuth(req);
    if (!staff) {
        return res.status(403).json({ success: false, message: 'Unauthorized staff access.' });
    }
    try {
        const staffObj = await Staff.findOne({ id: staff.id });
        if (!staffObj) {
            return res.status(404).json({ success: false, message: 'Staff member not found.' });
        }
        res.json({
            success: true,
            staff: {
                id: staffObj.id,
                name: staffObj.name,
                role: staffObj.role,
                avatarColor: staffObj.avatarColor,
                email: staffObj.email,
                mobile: staffObj.mobile,
                shift: staffObj.shift || 'Full Time',
                shiftTime: staffObj.shiftTime || '09:30 AM - 07:00 PM'
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT update staff profile settings
app.put('/api/staff/profile', async (req, res) => {
    const staff = await validateStaffAuth(req);
    if (!staff) {
        return res.status(403).json({ success: false, message: 'Unauthorized staff access.' });
    }
    const { email, mobile } = req.body;

    try {
        const staffObj = await Staff.findOneAndUpdate(
            { id: staff.id },
            { email: email || '', mobile: mobile || '' },
            { new: true }
        );
        res.json({ 
            success: true, 
            staff: {
                id: staffObj.id,
                name: staffObj.name,
                role: staffObj.role,
                avatarColor: staffObj.avatarColor,
                email: staffObj.email,
                mobile: staffObj.mobile,
                shift: staffObj.shift || 'Day',
                shiftTime: staffObj.shiftTime || '10:00 AM - 07:00 PM'
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get all staff members
app.get('/api/staff', async (req, res) => {
    if (!validateAdminAuth(req)) {
        return res.status(403).json({ success: false, message: 'Unauthorized access.' });
    }
    try {
        const staff = await Staff.find({});
        res.json({ success: true, staff });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Add staff member
app.post('/api/staff', async (req, res) => {
    if (!validateAdminAuth(req)) {
        return res.status(403).json({ success: false, message: 'Unauthorized access.' });
    }
    const { name, role, email, mobile, password, shift, shiftTime } = req.body;
    if (!name || !role) {
        return res.status(400).json({ success: false, message: 'Name and Role are required.' });
    }

    try {
        const colors = ['#e63946', '#457b9d', '#ffb703', '#2a9d8f', '#9b5de5', '#f15bb5', '#00bbf9'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];

        const newStaff = new Staff({
            id: 'staff-' + Date.now(),
            name,
            role,
            avatarColor: randomColor,
            email: email || '',
            mobile: mobile || '',
            password: password || 'DSS@123',
            shift: shift || 'Day',
            shiftTime: shiftTime || '10:00 AM - 07:00 PM'
        });

        await newStaff.save();
        res.status(201).json({ success: true, staff: newStaff });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update staff member
app.put('/api/staff/:id', async (req, res) => {
    if (!validateAdminAuth(req)) {
        return res.status(403).json({ success: false, message: 'Unauthorized access.' });
    }
    const { id } = req.params;
    const { name, role, email, mobile, shift, shiftTime } = req.body;
    if (!name || !role) {
        return res.status(400).json({ success: false, message: 'Name and Role are required.' });
    }

    try {
        const updateData = { 
            name, 
            role, 
            email: email || '', 
            mobile: mobile || '',
            shift: shift || 'Day',
            shiftTime: shiftTime || '10:00 AM - 07:00 PM'
        };
        const staff = await Staff.findOneAndUpdate(
            { id },
            updateData,
            { new: true }
        );

        if (!staff) {
            return res.status(404).json({ success: false, message: 'Staff member not found.' });
        }

        // Update tasks containing this staff member
        const { error: taskUpdateErr } = await supabase
            .from('tasks')
            .update({
                assignedTo: {
                    id: id,
                    name: name,
                    role: role
                }
            })
            .eq('assignedTo->>id', id);

        if (taskUpdateErr) {
            console.error('Error updating tasks on staff update:', taskUpdateErr);
        }

        res.json({ success: true, staff });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete staff member
app.delete('/api/staff/:id', async (req, res) => {
    if (!validateAdminAuth(req)) {
        return res.status(403).json({ success: false, message: 'Unauthorized access.' });
    }
    const { id } = req.params;

    try {
        const result = await Staff.deleteOne({ id });
        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, message: 'Staff member not found.' });
        }

        // Delete tasks associated with this staff member to keep data consistent
        await Task.deleteMany({ 'assignedTo.id': id });

        res.json({ success: true, message: 'Staff member deleted successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get all clients
app.get('/api/clients', async (req, res) => {
    if (!validateAdminAuth(req)) {
        return res.status(403).json({ success: false, message: 'Unauthorized access.' });
    }
    try {
        const clients = await Client.find({});
        res.json({ success: true, clients });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Add client
app.post('/api/clients', async (req, res) => {
    if (!validateAdminAuth(req)) {
        return res.status(403).json({ success: false, message: 'Unauthorized access.' });
    }
    const { name, email, status, package: clientPackage } = req.body;
    if (!name) {
        return res.status(400).json({ success: false, message: 'Client name is required.' });
    }

    try {
        const clientExists = await Client.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
        if (clientExists) {
            return res.status(400).json({ success: false, message: 'Client with this name already exists.' });
        }

        const newClient = new Client({
            id: 'client-' + Date.now(),
            name,
            email: email || '',
            status: status || 'active',
            package: clientPackage || { id: '', name: '', price: '', description: '' }
        });

        await newClient.save();
        res.status(201).json({ success: true, client: newClient });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update client
app.put('/api/clients/:id', async (req, res) => {
    if (!validateAdminAuth(req)) {
        return res.status(403).json({ success: false, message: 'Unauthorized access.' });
    }
    const { id } = req.params;
    const { name, email, status, package: clientPackage } = req.body;
    if (!name) {
        return res.status(400).json({ success: false, message: 'Client name is required.' });
    }

    try {
        const client = await Client.findOneAndUpdate(
            { id },
            { 
                name, 
                email: email || '', 
                status: status || 'active',
                package: clientPackage || { id: '', name: '', price: '', description: '' }
            },
            { new: true }
        );

        if (!client) {
            return res.status(404).json({ success: false, message: 'Client not found.' });
        }

        res.json({ success: true, client });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete client
app.delete('/api/clients/:id', async (req, res) => {
    if (!validateAdminAuth(req)) {
        return res.status(403).json({ success: false, message: 'Unauthorized access.' });
    }
    const { id } = req.params;

    try {
        const result = await Client.deleteOne({ id });
        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, message: 'Client not found.' });
        }
        res.json({ success: true, message: 'Client deleted successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET all packages
app.get('/api/packages', async (req, res) => {
    if (!validateAdminAuth(req)) {
        return res.status(403).json({ success: false, message: 'Unauthorized access.' });
    }
    try {
        const packages = await Package.find({});
        res.json({ success: true, packages });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET public packages (for website index.html pricing section)
app.get('/api/public/packages', async (req, res) => {
    try {
        const packages = await Package.find({ id: { $in: ['starter', 'growth', 'enterprise'] } });
        res.json({ success: true, packages });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Add new package
app.post('/api/packages', async (req, res) => {
    if (!validateAdminAuth(req)) {
        return res.status(403).json({ success: false, message: 'Unauthorized access.' });
    }
    const { name, price, description } = req.body;
    if (!name || !price) {
        return res.status(400).json({ success: false, message: 'Package Name and Price are required.' });
    }

    try {
        const newPackage = new Package({
            id: 'package-' + Date.now(),
            name,
            price,
            description: description || ''
        });

        await newPackage.save();
        res.status(201).json({ success: true, package: newPackage });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update package
app.put('/api/packages/:id', async (req, res) => {
    if (!validateAdminAuth(req)) {
        return res.status(403).json({ success: false, message: 'Unauthorized access.' });
    }
    const { id } = req.params;
    const { name, price, description } = req.body;
    if (!name || !price) {
        return res.status(400).json({ success: false, message: 'Package Name and Price are required.' });
    }

    try {
        const updatedPackage = await Package.findOneAndUpdate(
            { id },
            { name, price, description: description || '' },
            { new: true }
        );

        if (!updatedPackage) {
            return res.status(404).json({ success: false, message: 'Package not found.' });
        }

        // Also update all clients that use this package
        await Client.updateMany(
            { 'package.id': id },
            { 
                $set: { 
                    'package.name': name,
                    'package.price': price,
                    'package.description': description || ''
                } 
            }
        );

        res.json({ success: true, package: updatedPackage });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete package
app.delete('/api/packages/:id', async (req, res) => {
    if (!validateAdminAuth(req)) {
        return res.status(403).json({ success: false, message: 'Unauthorized access.' });
    }
    const { id } = req.params;

    if (['starter', 'growth', 'enterprise'].includes(id)) {
        return res.status(400).json({ success: false, message: 'System pricing packages required by the website cannot be deleted.' });
    }

    try {
        const result = await Package.deleteOne({ id });
        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, message: 'Package not found.' });
        }

        // Reset package for clients who had this package
        await Client.updateMany(
            { 'package.id': id },
            { 
                $set: { 
                    'package.id': '',
                    'package.name': '',
                    'package.price': '',
                    'package.description': ''
                } 
            }
        );

        res.json({ success: true, message: 'Package deleted successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Helper to validate Staff Authorization Token
async function validateStaffAuth(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer staff-token-')) {
        return null;
    }
    try {
        const tokenPart = authHeader.substring(19); // Length of "Bearer staff-token-"
        const staffId = Buffer.from(tokenPart, 'base64').toString('utf8');
        const staff = await Staff.findOne({ id: staffId });
        return staff;
    } catch (e) {
        return null;
    }
}

// Staff Login Route
app.post('/api/staff/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }
    try {
        const staff = await Staff.findOne({ email });
        if (!staff || staff.password !== password) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }
        const token = 'staff-token-' + Buffer.from(staff.id).toString('base64');
        res.json({
            success: true,
            token,
            staff: {
                id: staff.id,
                name: staff.name,
                role: staff.role,
                avatarColor: staff.avatarColor,
                email: staff.email,
                mobile: staff.mobile,
                shift: staff.shift || 'Day',
                shiftTime: staff.shiftTime || '10:00 AM - 07:00 PM'
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});


// GET current staff member's punch status for today
app.get('/api/attendance/status', async (req, res) => {
    const staff = await validateStaffAuth(req);
    if (!staff) {
        return res.status(403).json({ success: false, message: 'Unauthorized staff access.' });
    }
    try {
        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
        const log = await Attendance.findOne({ staffId: staff.id, date: todayStr });
        res.json({ success: true, log });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST punch-in
app.post('/api/attendance/punch-in', async (req, res) => {
    const staff = await validateStaffAuth(req);
    if (!staff) {
        return res.status(403).json({ success: false, message: 'Unauthorized staff access.' });
    }
    try {
        // Verify IP address restriction if configured
        const allowedIpEnv = process.env.ALLOWED_PUNCH_IP || '171.61.165.56';
        if (allowedIpEnv) {
            const allowedIps = allowedIpEnv.split(',').map(ip => ip.trim());
            
            const forwarded = req.headers['x-forwarded-for'];
            let clientIp = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;
            if (clientIp && clientIp.startsWith('::ffff:')) {
                clientIp = clientIp.substring(7);
            }
            
            const isLocal = clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === 'localhost';
            console.log(`[Punch In Debug] clientIp: "${clientIp}", isLocal: ${isLocal}, allowedIps:`, allowedIps);
            if (!isLocal && !allowedIps.includes(clientIp)) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'You must be connected to the office WiFi (Airtal_DSS) to register attendance.' 
                });
            }
        }

        const now = new Date();
        const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
        
        // Check if already punched in today
        let log = await Attendance.findOne({ staffId: staff.id, date: todayStr });
        if (log) {
            return res.status(400).json({ success: false, message: 'Already punched in today.' });
        }

        const timeStr = now.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });
        const [hrs, mins] = timeStr.split(':').map(Number);
        const currentMinutes = hrs * 60 + mins;

        // Check shift start time restriction for all staff members based on their shiftTime
        if (staff.shiftTime) {
            const shiftStart = parseShiftStartTime(staff.shiftTime);
            if (shiftStart) {
                const startMinutes = shiftStart.hours * 60 + shiftStart.minutes;
                
                if (currentMinutes < startMinutes) {
                    const timeDisplay = staff.shiftTime.split('-')[0].trim();
                    return res.status(400).json({ 
                        success: false, 
                        message: `You cannot punch-in before your shift start time (${timeDisplay}).` 
                    });
                }
            }
        }

        // Calculate status dynamically based on shift start time (with 15 min grace period)
        let status = 'present';
        const shiftStart = parseShiftStartTime(staff.shiftTime);
        if (shiftStart) {
            const startMinutes = shiftStart.hours * 60 + shiftStart.minutes;
            if (currentMinutes > startMinutes + 15) {
                status = 'late';
            }
        } else {
            // Fallback default: standard start time is 10:00 AM, grace period of 15 min -> 10:15 AM
            if (currentMinutes > 10 * 60 + 15) {
                status = 'late';
            }
        }

        log = new Attendance({
            id: 'att-' + Date.now(),
            staffId: staff.id,
            staffName: staff.name,
            date: todayStr,
            punchIn: now,
            status
        });

        await log.save();
        res.status(201).json({ success: true, message: 'Punched in successfully.', log });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST punch-out
app.post('/api/attendance/punch-out', async (req, res) => {
    const staff = await validateStaffAuth(req);
    if (!staff) {
        return res.status(403).json({ success: false, message: 'Unauthorized staff access.' });
    }
    try {
        // Verify IP address restriction if configured
        const allowedIpEnv = process.env.ALLOWED_PUNCH_IP || '171.61.165.56';
        if (allowedIpEnv) {
            const allowedIps = allowedIpEnv.split(',').map(ip => ip.trim());
            
            const forwarded = req.headers['x-forwarded-for'];
            let clientIp = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;
            if (clientIp && clientIp.startsWith('::ffff:')) {
                clientIp = clientIp.substring(7);
            }
            
            const isLocal = clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === 'localhost';
            console.log(`[Punch Out Debug] clientIp: "${clientIp}", isLocal: ${isLocal}, allowedIps:`, allowedIps);
            if (!isLocal && !allowedIps.includes(clientIp)) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'You must be connected to the office WiFi (Airtal_DSS) to register attendance.' 
                });
            }
        }

        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
        
        const log = await Attendance.findOne({ staffId: staff.id, date: todayStr });
        if (!log) {
            return res.status(400).json({ success: false, message: 'Have not punched in today.' });
        }
        if (log.punchOut) {
            return res.status(400).json({ success: false, message: 'Already punched out today.' });
        }

        const now = new Date();
        log.punchOut = now;

        // Calculate hours
        const diffMs = now - new Date(log.punchIn);
        const diffHrs = Number((diffMs / (1000 * 60 * 60)).toFixed(2));
        log.totalHours = diffHrs;

        // Determine if half-day (less than 4 hours)
        if (diffHrs < 4.0) {
            log.status = 'half_day';
        }

        await log.save();
        res.json({ success: true, message: 'Punched out successfully.', log });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET personal attendance logs for current staff
app.get('/api/attendance/history', async (req, res) => {
    const staff = await validateStaffAuth(req);
    if (!staff) {
        return res.status(403).json({ success: false, message: 'Unauthorized staff access.' });
    }
    try {
        const logs = await Attendance.find({ staffId: staff.id }).sort({ punchIn: -1 });
        res.json({ success: true, logs });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET tasks assigned to current staff
app.get('/api/staff/tasks', async (req, res) => {
    const staff = await validateStaffAuth(req);
    if (!staff) {
        return res.status(403).json({ success: false, message: 'Unauthorized staff access.' });
    }
    try {
        const tasks = await Task.find({ 'assignedTo.id': staff.id }).sort({ createdAt: -1 });
        res.json({ success: true, tasks });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT update task status by staff
app.put('/api/staff/tasks/:id/status', async (req, res) => {
    const staff = await validateStaffAuth(req);
    if (!staff) {
        return res.status(403).json({ success: false, message: 'Unauthorized staff access.' });
    }
    const { id } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['pending', 'in_progress', 'under_review', 'completed'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid task status.' });
    }

    try {
        const task = await Task.findOneAndUpdate(
            { id, 'assignedTo.id': staff.id },
            { status },
            { new: true }
        );
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found or not assigned to you.' });
        }
        res.json({ success: true, task });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT submit task by staff
app.put('/api/staff/tasks/:id/submit', async (req, res) => {
    const staff = await validateStaffAuth(req);
    if (!staff) {
        return res.status(403).json({ success: false, message: 'Unauthorized staff access.' });
    }
    const { id } = req.params;
    const { submissionLink, submissionComment } = req.body;

    try {
        const task = await Task.findOneAndUpdate(
            { id, 'assignedTo.id': staff.id },
            { 
                status: 'completed',
                submissionLink: submissionLink || 'Completed',
                submissionComment: submissionComment || 'Work completed by staff.'
            },
            { new: true }
        );
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found or not assigned to you.' });
        }
        res.json({ success: true, task });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET all attendance logs (Admin Only)
app.get('/api/attendance/admin/all', async (req, res) => {
    if (!validateAdminAuth(req)) {
        return res.status(403).json({ success: false, message: 'Unauthorized admin access.' });
    }
    try {
        const logs = await Attendance.find({}).sort({ punchIn: -1 });
        res.json({ success: true, logs });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Helper to parse cookies from headers
const getCookie = (req, name) => {
    const cookies = req.headers.cookie;
    if (!cookies) return null;
    const cookie = cookies.split(';').find(c => c.trim().startsWith(name + '='));
    return cookie ? cookie.split('=')[1] : null;
};

// Serve staff workspace at /staff route
app.get('/staff', (req, res) => {
    const token = getCookie(req, 'staffToken');
    if (token && token.startsWith('staff-token-')) {
        res.sendFile(path.join(__dirname, 'protected', 'staff.html'));
    } else {
        res.redirect('/dss?role=staff');
    }
});

// Redirect static staff.html requests to protected route
app.get('/staff.html', (req, res) => {
    res.redirect('/staff');
});

// Serve admin dashboard at /admin route
app.get('/admin', (req, res) => {
    const token = getCookie(req, 'adminToken');
    if (token && token.startsWith('dss-token-')) {
        res.sendFile(path.join(__dirname, 'protected', 'admin.html'));
    } else {
        res.redirect('/dss?role=admin');
    }
});

// Redirect static admin.html requests to protected route
app.get('/admin.html', (req, res) => {
    res.redirect('/admin');
});

// Serve unified login page at /dss route
app.get('/dss', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// ==================== BRAND LOGOS ROUTES ====================

// GET public brand logos (for home page marquee)
app.get('/api/public/brand-logos', async (req, res) => {
    try {
        const logos = await BrandLogo.find({}).sort({ createdAt: -1 });
        res.json({ success: true, logos });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET brand logos (for admin dashboard, authenticated)
app.get('/api/brand-logos', async (req, res) => {
    if (!validateAdminAuth(req)) {
        return res.status(403).json({ success: false, message: 'Unauthorized access.' });
    }
    try {
        const logos = await BrandLogo.find({}).sort({ createdAt: -1 });
        res.json({ success: true, logos });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST upload brand logo (supports dark and light theme logos)
app.post('/api/brand-logos', upload.fields([{ name: 'darkLogoFile', maxCount: 1 }, { name: 'lightLogoFile', maxCount: 1 }]), async (req, res) => {
    if (!validateAdminAuth(req)) {
        return res.status(403).json({ success: false, message: 'Unauthorized access.' });
    }
    const darkFile = req.files && req.files['darkLogoFile'] ? req.files['darkLogoFile'][0] : null;
    const lightFile = req.files && req.files['lightLogoFile'] ? req.files['lightLogoFile'][0] : null;

    try {
        const { name } = req.body;
        
        if (!darkFile || !lightFile) {
            if (darkFile) await deleteFile(darkFile);
            if (lightFile) await deleteFile(lightFile);
            return res.status(400).json({ success: false, message: 'Please upload both dark theme and light theme logo files.' });
        }
        
        const darkImagePath = getFileUrl(darkFile);
        const lightImagePath = getFileUrl(lightFile);
        
        const newLogo = new BrandLogo({
            id: 'logo-' + Date.now(),
            darkImagePath,
            lightImagePath,
            name: name || ''
        });
        
        await newLogo.save();
        res.status(201).json({ success: true, logo: newLogo });
    } catch (error) {
        if (darkFile) await deleteFile(darkFile);
        if (lightFile) await deleteFile(lightFile);
        res.status(500).json({ success: false, message: error.message });
    }
});

// DELETE brand logo
app.delete('/api/brand-logos/:id', async (req, res) => {
    if (!validateAdminAuth(req)) {
        return res.status(403).json({ success: false, message: 'Unauthorized access.' });
    }
    const { id } = req.params;
    try {
        const logo = await BrandLogo.findOne({ id });
        if (!logo) {
            return res.status(404).json({ success: false, message: 'Logo not found.' });
        }

        // Clean up R2/local files
        await deleteFile(logo.darkImagePath);
        await deleteFile(logo.lightImagePath);

        await BrandLogo.deleteOne({ id });
        res.json({ success: true, message: 'Logo deleted successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==================== TESTIMONIALS / REVIEWS ROUTES ====================

// GET public reviews (for home page marquee)
app.get('/api/public/reviews', async (req, res) => {
    try {
        const reviews = await Review.find({}).sort({ createdAt: -1 });
        res.json({ success: true, reviews });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET reviews (for admin dashboard, authenticated)
app.get('/api/reviews', async (req, res) => {
    if (!validateAdminAuth(req)) {
        return res.status(403).json({ success: false, message: 'Unauthorized access.' });
    }
    try {
        const reviews = await Review.find({}).sort({ createdAt: -1 });
        res.json({ success: true, reviews });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST add new review
app.post('/api/reviews', async (req, res) => {
    if (!validateAdminAuth(req)) {
        return res.status(403).json({ success: false, message: 'Unauthorized access.' });
    }
    const { name, rating, text, source, avatarInitials } = req.body;
    if (!name || !text) {
        return res.status(400).json({ success: false, message: 'Name and Review Text are required.' });
    }
    try {
        // Generate avatar initials if not provided
        let initials = avatarInitials ? avatarInitials.trim() : '';
        if (!initials) {
            const parts = name.trim().split(/\s+/);
            if (parts.length >= 2) {
                initials = (parts[0][0] + parts[1][0]).toUpperCase();
            } else if (parts.length === 1 && parts[0].length > 0) {
                initials = parts[0].substring(0, 2).toUpperCase();
            } else {
                initials = 'CL';
            }
        }
        
        const newReview = new Review({
            id: 'rev-' + Date.now(),
            name,
            rating: Number(rating) || 5,
            text,
            source: source || 'Google Review',
            avatarInitials: initials
        });
        
        await newReview.save();
        res.status(201).json({ success: true, review: newReview });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUT update review
app.put('/api/reviews/:id', async (req, res) => {
    if (!validateAdminAuth(req)) {
        return res.status(403).json({ success: false, message: 'Unauthorized access.' });
    }
    const { id } = req.params;
    const { name, rating, text, source, avatarInitials } = req.body;
    if (!name || !text) {
        return res.status(400).json({ success: false, message: 'Name and Review Text are required.' });
    }
    try {
        let initials = avatarInitials ? avatarInitials.trim() : '';
        if (!initials) {
            const parts = name.trim().split(/\s+/);
            if (parts.length >= 2) {
                initials = (parts[0][0] + parts[1][0]).toUpperCase();
            } else if (parts.length === 1 && parts[0].length > 0) {
                initials = parts[0].substring(0, 2).toUpperCase();
            } else {
                initials = 'CL';
            }
        }
        
        const updatedReview = await Review.findOneAndUpdate(
            { id },
            { name, rating: Number(rating) || 5, text, source: source || 'Google Review', avatarInitials: initials },
            { new: true }
        );
        
        if (!updatedReview) {
            return res.status(404).json({ success: false, message: 'Review not found.' });
        }
        res.json({ success: true, review: updatedReview });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// DELETE review
app.delete('/api/reviews/:id', async (req, res) => {
    if (!validateAdminAuth(req)) {
        return res.status(403).json({ success: false, message: 'Unauthorized access.' });
    }
    const { id } = req.params;
    try {
        const result = await Review.deleteOne({ id });
        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, message: 'Review not found.' });
        }
        res.json({ success: true, message: 'Review deleted successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// In-memory store for OTPs
const otpStore = new Map();

// Helper to send email
const sendMail = async (to, subject, html) => {
    // 1. If Resend API Key is defined, use Resend HTTP API (Bypasses SMTP port blocks)
    if (process.env.RESEND_API_KEY) {
        try {
            console.log(`[sendMail] Sending email to ${to} using Resend API...`);
            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: process.env.SMTP_FROM || 'onboarding@resend.dev',
                    to: [to],
                    subject: subject,
                    html: html
                })
            });
            
            const data = await response.json();
            if (response.ok) {
                console.log(`[sendMail] Email sent successfully via Resend API to ${to}:`, data.id);
                return true;
            } else {
                console.error(`[sendMail] Resend API Error:`, data);
                throw new Error(data.message || 'Resend API failed to send email.');
            }
        } catch (err) {
            console.error('[sendMail] Resend API send error:', err);
            throw err;
        }
    }

    // 2. Fallback: Use Nodemailer SMTP
    try {
        console.log(`[sendMail] Resend API key not found. Falling back to SMTP for ${to}...`);
        const smtpHost = process.env.SMTP_HOST || 'smtp.hostinger.com';
        let resolvedHost = smtpHost;

        try {
            const dns = require('dns').promises;
            const addresses = await dns.resolve4(smtpHost);
            if (addresses && addresses.length > 0) {
                resolvedHost = addresses[0];
                console.log(`[sendMail] Resolved ${smtpHost} to IPv4: ${resolvedHost}`);
            }
        } catch (dnsErr) {
            console.warn(`[sendMail] DNS resolve4 failed, using original host name:`, dnsErr.message);
        }

        const transporter = nodemailer.createTransport({
            host: resolvedHost,
            port: parseInt(process.env.SMTP_PORT) || 465,
            secure: parseInt(process.env.SMTP_PORT) === 465 || !process.env.SMTP_PORT,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            },
            connectionTimeout: 15000,
            tls: {
                rejectUnauthorized: false,
                servername: smtpHost
            }
        });

        const mailOptions = {
            from: process.env.SMTP_FROM || `"Design Shaper Studio" <${process.env.SMTP_USER}>`,
            to,
            subject,
            html
        };
        await transporter.sendMail(mailOptions);
        console.log(`Email sent successfully to ${to} via SMTP`);
        return true;
    } catch (err) {
        console.error('Nodemailer send error:', err);
        throw new Error('Failed to send email. Please check server SMTP configuration.');
    }
};

// POST: Request OTP for Staff Forgot Password
app.post('/api/staff/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    try {
        // Find staff by email
        const staffMember = await Staff.findOne({ email: email.trim().toLowerCase() });
        if (!staffMember) {
            return res.status(404).json({ success: false, message: 'No staff account found with this email address.' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes from now

        // Store OTP
        otpStore.set(email.trim().toLowerCase(), { otp, expiry });

        // Send OTP Email
        const emailContent = `
            <div style="font-family: 'Quicksand', sans-serif; max-width: 500px; margin: 0 auto; padding: 25px; background-color: #0f0f15; border: 1px solid #fa9d1c; border-radius: 16px; color: #ffffff;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h2 style="color: #fa9d1c; margin: 0; font-weight: 700; font-size: 24px;">Design Shaper Studio</h2>
                    <p style="color: #62627a; margin: 5px 0 0 0; font-size: 14px;">Staff Portal Verification</p>
                </div>
                <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.08); margin-bottom: 20px;">
                <p style="font-size: 15px; color: #9a9ab0; line-height: 1.6;">Hello <strong>${staffMember.name}</strong>,</p>
                <p style="font-size: 15px; color: #9a9ab0; line-height: 1.6;">You have requested a verification code to recover your password. Please use the following 6-digit OTP (One Time Password):</p>
                <div style="text-align: center; margin: 25px 0;">
                    <span style="font-size: 32px; font-weight: 700; letter-spacing: 5px; color: #fa9d1c; background: rgba(250, 157, 28, 0.08); padding: 12px 25px; border-radius: 8px; border: 1px dashed rgba(250, 157, 28, 0.3);">${otp}</span>
                </div>
                <p style="font-size: 13px; color: #62627a; line-height: 1.5; margin-top: 25px;">Note: This verification code is valid for <strong>10 minutes</strong>. If you did not request this, you can safely ignore this email.</p>
                <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.08); margin-top: 25px; margin-bottom: 15px;">
                <div style="text-align: center; font-size: 12px; color: #62627a;">
                    © 2026 Design Shaper Studio. All rights reserved.
                </div>
            </div>
        `;

        await sendMail(email.trim().toLowerCase(), 'Staff Portal Verification Code (OTP)', emailContent);
        return res.status(200).json({ success: true, message: 'Verification code sent to your email.' });
    } catch (error) {
        console.error('Forgot password error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

// POST: Verify OTP and Email Password
app.post('/api/staff/verify-otp', async (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) {
        return res.status(400).json({ success: false, message: 'Email and verification code are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    try {
        const storedData = otpStore.get(cleanEmail);
        if (!storedData) {
            return res.status(400).json({ success: false, message: 'No verification request found for this email.' });
        }

        if (Date.now() > storedData.expiry) {
            otpStore.delete(cleanEmail);
            return res.status(400).json({ success: false, message: 'Verification code has expired. Please request a new one.' });
        }

        if (storedData.otp !== cleanCode) {
            return res.status(400).json({ success: false, message: 'Invalid verification code. Please check and try again.' });
        }

        // Fetch staff password
        const staffMember = await Staff.findOne({ email: cleanEmail });
        if (!staffMember) {
            return res.status(404).json({ success: false, message: 'Staff member account not found.' });
        }

        // Password Recovery Email
        const emailContent = `
            <div style="font-family: 'Quicksand', sans-serif; max-width: 500px; margin: 0 auto; padding: 25px; background-color: #0f0f15; border: 1px solid #fa9d1c; border-radius: 16px; color: #ffffff;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h2 style="color: #fa9d1c; margin: 0; font-weight: 700; font-size: 24px;">Design Shaper Studio</h2>
                    <p style="color: #62627a; margin: 5px 0 0 0; font-size: 14px;">Staff Password Recovery</p>
                </div>
                <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.08); margin-bottom: 20px;">
                <p style="font-size: 15px; color: #9a9ab0; line-height: 1.6;">Hello <strong>${staffMember.name}</strong>,</p>
                <p style="font-size: 15px; color: #9a9ab0; line-height: 1.6;">Your verification was successful! Here are your current login credentials for the Staff Portal:</p>
                <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 20px; margin: 25px 0;">
                    <table style="width: 100%; font-size: 15px; color: #ffffff; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 6px 0; color: #62627a; width: 120px; font-weight: 600;">Email:</td>
                            <td style="padding: 6px 0; color: #ffffff; font-weight: 500;">${staffMember.email}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; color: #62627a; font-weight: 600;">Password:</td>
                            <td style="padding: 6px 0; color: #fa9d1c; font-weight: 700; font-size: 17px; letter-spacing: 0.5px;">${staffMember.password}</td>
                        </tr>
                    </table>
                </div>
                <p style="font-size: 13px; color: #62627a; line-height: 1.5; margin-top: 25px;">For security, we recommend that you do not share your credentials with anyone. If you want to update your password in the future, please ask the Administrator.</p>
                <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.08); margin-top: 25px; margin-bottom: 15px;">
                <div style="text-align: center; font-size: 12px; color: #62627a;">
                    © 2026 Design Shaper Studio. All rights reserved.
                </div>
            </div>
        `;

        await sendMail(cleanEmail, 'Your Staff Portal Login Credentials', emailContent);

        // Cleanup OTP
        otpStore.delete(cleanEmail);

        return res.status(200).json({ success: true, message: 'Your login credentials have been sent to your email.' });
    } catch (error) {
        console.error('Verify OTP error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

// ========================================================================
// INTERNAL CHAT / MESSAGING API
// ========================================================================
// GET all staff members list for Admin Chat sidebar with unread counts
app.get('/api/chat/contacts', async (req, res) => {
    if (!validateAdminAuth(req)) {
        return res.status(403).json({ success: false, message: 'Unauthorized access.' });
    }
    try {
        const staff = await Staff.find({});
        const unreadMessages = await Chat.find({ receiverId: 'admin', read: false });
        
        // Filter out messages that have been soft-deleted by the receiver (admin)
        const activeUnread = unreadMessages.filter(m => !m.deletedByReceiver);

        const contacts = staff.map(s => {
            const contactUnread = activeUnread.filter(m => m.senderId === s.id).length;
            return {
                id: s.id,
                name: s.name,
                role: s.role,
                avatarColor: s.avatarColor || '#fa9d1c',
                unreadCount: contactUnread
            };
        });
        res.json({ success: true, contacts });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET message history between user and a partner
app.get('/api/chat/history/:partnerId', async (req, res) => {
    const { partnerId } = req.params;
    let userId = null;
    
    // Check if requester is admin
    const isAdmin = validateAdminAuth(req);
    let staff = null;
    if (!isAdmin) {
        staff = await validateStaffAuth(req);
        if (!staff) {
            return res.status(403).json({ success: false, message: 'Unauthorized access.' });
        }
        userId = staff.id;
    } else {
        userId = 'admin';
    }

    try {
        // Retrieve all messages
        const messages = await Chat.find({});
        
        // Filter messages locally (checking soft-deleted flags)
        const chatHistory = messages.filter(m => {
            const isMatch = (m.senderId === userId && m.receiverId === partnerId) || 
                            (m.senderId === partnerId && m.receiverId === userId);
            if (!isMatch) return false;

            // Hide if deleted by requester
            if (m.senderId === userId && m.deletedBySender) return false;
            if (m.receiverId === userId && m.deletedByReceiver) return false;

            return true;
        });

        // Sort by date (createdAt)
        chatHistory.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        res.json({ success: true, history: chatHistory });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST send a message
app.post('/api/chat/send', async (req, res) => {
    const { receiverId, message } = req.body;
    if (!receiverId || !message || !message.trim()) {
        return res.status(400).json({ success: false, message: 'Receiver and message text are required.' });
    }

    let senderId = null;
    let senderName = null;

    // Check if sender is admin
    const isAdmin = validateAdminAuth(req);
    let staff = null;
    if (!isAdmin) {
        staff = await validateStaffAuth(req);
        if (!staff) {
            return res.status(403).json({ success: false, message: 'Unauthorized access.' });
        }
        senderId = staff.id;
        senderName = staff.name;
    } else {
        senderId = 'admin';
        senderName = 'Admin';
    }

    try {
        const chatMsg = new Chat({
            id: 'msg-' + Date.now(),
            senderId,
            senderName,
            receiverId,
            message: message.trim(),
            read: false,
            deletedBySender: false,
            deletedByReceiver: false,
            createdAt: new Date()
        });

        await chatMsg.save();
        res.status(201).json({ success: true, message: chatMsg });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE chat history between user and a partner (Soft Delete - Delete for Me)
app.delete('/api/chat/history/:partnerId', async (req, res) => {
    const { partnerId } = req.params;
    let userId = null;

    const isAdmin = validateAdminAuth(req);
    if (!isAdmin) {
        const staff = await validateStaffAuth(req);
        if (!staff) {
            return res.status(403).json({ success: false, message: 'Unauthorized access.' });
        }
        userId = staff.id;
    } else {
        userId = 'admin';
    }

    try {
        // Mark messages sent by user to partner as deletedBySender
        const { error: err1 } = await supabase
            .from('chats')
            .update({ deletedBySender: true })
            .eq('senderId', userId)
            .eq('receiverId', partnerId);

        // Mark messages received by user from partner as deletedByReceiver
        const { error: err2 } = await supabase
            .from('chats')
            .update({ deletedByReceiver: true })
            .eq('senderId', partnerId)
            .eq('receiverId', userId);

        if (err1) throw err1;
        if (err2) throw err2;

        res.json({ success: true, message: 'Chat history cleared for you successfully.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT mark messages from partner as read
app.put('/api/chat/read/:partnerId', async (req, res) => {
    const { partnerId } = req.params;
    let userId = null;

    const isAdmin = validateAdminAuth(req);
    if (!isAdmin) {
        const staff = await validateStaffAuth(req);
        if (!staff) {
            return res.status(403).json({ success: false, message: 'Unauthorized access.' });
        }
        userId = staff.id;
    } else {
        userId = 'admin';
    }

    try {
        const { error } = await supabase
            .from('chats')
            .update({ read: true })
            .eq('senderId', partnerId)
            .eq('receiverId', userId)
            .eq('read', false);
        
        if (error) throw error;
        res.json({ success: true, message: 'Messages marked as read.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET total unread messages count for sidebar badge
app.get('/api/chat/unread-count', async (req, res) => {
    let userId = null;
    const isAdmin = validateAdminAuth(req);
    if (!isAdmin) {
        const staff = await validateStaffAuth(req);
        if (!staff) {
            return res.status(403).json({ success: false, message: 'Unauthorized access.' });
        }
        userId = staff.id;
    } else {
        userId = 'admin';
    }

    try {
        const unread = await Chat.find({ receiverId: userId, read: false });
        // Only count messages that are NOT soft-deleted by the receiver
        const activeUnread = unread.filter(m => !m.deletedByReceiver);
        res.json({ success: true, count: activeUnread.length });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Migration: Fix attendance logs where totalHours is 0 but punchOut is present
async function migrateAttendanceLogs() {
    try {
        const logs = await Attendance.find({});
        for (const log of logs) {
            if (log.punchIn && log.punchOut && (!log.totalHours || log.totalHours === 0)) {
                const pIn = new Date(log.punchIn);
                const pOut = new Date(log.punchOut);
                const diffMs = pOut - pIn;
                const diffHrs = Number((diffMs / (1000 * 60 * 60)).toFixed(2));
                
                if (diffHrs > 0) {
                    let status = log.status || 'present';
                    if (diffHrs < 4.0) {
                        status = 'half_day';
                    }
                    await Attendance.findOneAndUpdate(
                        { id: log.id },
                        { totalHours: diffHrs, status }
                    );
                    console.log(`[Migration] Fixed attendance log ${log.id}: set totalHours to ${diffHrs} and status to ${status}`);
                }
            }
        }
    } catch (err) {
        console.error('[Migration] Failed to migrate attendance logs:', err.message);
    }
}

// Run migration asynchronously after startup
setTimeout(migrateAttendanceLogs, 5000);

// Fallback: redirect undefined routes to homepage
app.get(/.*/, (req, res) => {
    res.redirect('/');
});

app.listen(PORT, () => {
    console.log(`DSS - Design Shaper Studio server is running on http://localhost:${PORT}`);
});