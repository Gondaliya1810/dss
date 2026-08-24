const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
require('dotenv').config();
const { Project, Lead, Client, Staff, Task, Package, Attendance, BrandLogo, Review, supabase } = require('./db');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure Multer memory storage
const storage = multer.memoryStorage();

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

// Helper to upload file to Supabase Storage
const uploadToSupabase = async (file) => {
    if (!file) return null;
    
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const fileName = uniqueSuffix + path.extname(file.originalname);

    const { data, error } = await supabase.storage
        .from('dss-uploads')
        .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            cacheControl: '3600',
            upsert: false
        });

    if (error) {
        throw new Error('Supabase storage upload failed: ' + error.message);
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    return `${supabaseUrl}/storage/v1/object/public/dss-uploads/${fileName}`;
};

// Helper to delete file from Supabase Storage
const deleteFromSupabase = async (fileUrl) => {
    if (!fileUrl) return;
    if (!fileUrl.includes('/storage/v1/object/public/dss-uploads/')) return;

    const parts = fileUrl.split('/');
    const fileName = parts[parts.length - 1];

    const { error } = await supabase.storage
        .from('dss-uploads')
        .remove([fileName]);

    if (error) {
        console.error('Error deleting from Supabase storage:', error.message);
    } else {
        console.log('Deleted from Supabase storage:', fileName);
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

    let mediaPaths = [];
    let thumbnailPath = null;

    try {
        const { title, category, description } = req.body;
        
        if (!title || !category || workFiles.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Title, category, and at least one media file are required.' 
            });
        }

        // Validate auth header (token)
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer dss-token-')) {
            return res.status(403).json({ success: false, message: 'Unauthorized access.' });
        }

        // Upload media files to Supabase Storage
        for (const file of workFiles) {
            const url = await uploadToSupabase(file);
            if (url) mediaPaths.push(url);
        }

        // Upload thumbnail to Supabase Storage
        if (thumbnailFile) {
            thumbnailPath = await uploadToSupabase(thumbnailFile);
        }

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
            thumbnailPath,
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
        // Clean up newly uploaded files on error
        for (const url of mediaPaths) { await deleteFromSupabase(url); }
        if (thumbnailPath) { await deleteFromSupabase(thumbnailPath); }
        return res.status(500).json({ success: false, message: error.message });
    }
});

// PUT update a project
app.put('/api/projects/:id', upload.fields([{ name: 'workFiles', maxCount: 15 }, { name: 'thumbnailFile', maxCount: 1 }]), async (req, res) => {
    const workFiles = req.files && req.files['workFiles'] ? req.files['workFiles'] : [];
    const thumbnailFile = req.files && req.files['thumbnailFile'] ? req.files['thumbnailFile'][0] : null;

    let newMediaPaths = [];
    let updatedThumbnailPath = null;

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
            return res.status(403).json({ success: false, message: 'Unauthorized access.' });
        }

        const project = await Project.findOne({ id });
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found.' });
        }

        if (keepMediaPaths.length === 0 && workFiles.length === 0) {
            return res.status(400).json({ success: false, message: 'At least one media file is required.' });
        }

        // Delete removed files from Supabase Storage
        const currentMediaPaths = project.mediaPaths || [project.imagePath];
        const deletedMediaPaths = currentMediaPaths.filter(pathVal => !keepMediaPaths.includes(pathVal));
        
        for (const pathVal of deletedMediaPaths) {
            await deleteFromSupabase(pathVal);
        }

        // Upload new media files to Supabase Storage
        for (const file of workFiles) {
            const url = await uploadToSupabase(file);
            if (url) newMediaPaths.push(url);
        }
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
        updatedThumbnailPath = project.thumbnailPath;
        if (thumbnailFile) {
            if (project.thumbnailPath) {
                await deleteFromSupabase(project.thumbnailPath);
            }
            updatedThumbnailPath = await uploadToSupabase(thumbnailFile);
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
        // Clean up newly uploaded files on error
        for (const url of newMediaPaths) { await deleteFromSupabase(url); }
        if (thumbnailFile && updatedThumbnailPath && updatedThumbnailPath !== project.thumbnailPath) {
            await deleteFromSupabase(updatedThumbnailPath);
        }
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

        // Remove media files from Supabase Storage
        if (project.mediaPaths && project.mediaPaths.length > 0) {
            for (const mediaPath of project.mediaPaths) {
                await deleteFromSupabase(mediaPath);
            }
        } else if (project.imagePath) {
            await deleteFromSupabase(project.imagePath);
        }

        // Remove thumbnail file from Supabase Storage if it exists
        if (project.thumbnailPath) {
            await deleteFromSupabase(project.thumbnailPath);
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
                mobile: staffObj.mobile
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
    const { name, role, email, mobile, password } = req.body;
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
            password: password || 'DSS@123'
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
    const { name, role, email, mobile } = req.body;
    if (!name || !role) {
        return res.status(400).json({ success: false, message: 'Name and Role are required.' });
    }

    try {
        const updateData = { name, role, email: email || '', mobile: mobile || '' };
        const staff = await Staff.findOneAndUpdate(
            { id },
            updateData,
            { new: true }
        );

        if (!staff) {
            return res.status(404).json({ success: false, message: 'Staff member not found.' });
        }

        // Update tasks containing this staff member
        await Task.updateMany(
            { 'assignedTo.id': id },
            { 
                $set: { 
                    'assignedTo.name': name,
                    'assignedTo.role': role
                } 
            }
        );

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
                email: staff.email
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
        const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
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
        const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
        
        // Check if already punched in today
        let log = await Attendance.findOne({ staffId: staff.id, date: todayStr });
        if (log) {
            return res.status(400).json({ success: false, message: 'Already punched in today.' });
        }

        // Check if late (e.g. punch-in after 10:00 AM)
        const now = new Date();
        let status = 'present';
        const startOfTodayTenAm = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0);
        if (now > startOfTodayTenAm) {
            status = 'late';
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
        const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
        
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
        const diffMs = now - log.punchIn;
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
    if (!submissionLink) {
        return res.status(400).json({ success: false, message: 'Submission link is required.' });
    }

    try {
        const task = await Task.findOneAndUpdate(
            { id, 'assignedTo.id': staff.id },
            { 
                status: 'under_review',
                submissionLink,
                submissionComment: submissionComment || ''
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

    let darkImagePath = null;
    let lightImagePath = null;

    try {
        const { name } = req.body;
        
        if (!darkFile || !lightFile) {
            return res.status(400).json({ success: false, message: 'Please upload both dark theme and light theme logo files.' });
        }
        
        darkImagePath = await uploadToSupabase(darkFile);
        lightImagePath = await uploadToSupabase(lightFile);
        
        const newLogo = new BrandLogo({
            id: 'logo-' + Date.now(),
            darkImagePath,
            lightImagePath,
            name: name || ''
        });
        
        await newLogo.save();
        res.status(201).json({ success: true, logo: newLogo });
    } catch (error) {
        if (darkImagePath) await deleteFromSupabase(darkImagePath);
        if (lightImagePath) await deleteFromSupabase(lightImagePath);
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

        // Clean up Supabase storage files
        await deleteFromSupabase(logo.darkImagePath);
        await deleteFromSupabase(logo.lightImagePath);

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

// Fallback: serve index.html for undefined routes
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`DSS - Design Shaper Studio server is running on http://localhost:${PORT}`);
});
