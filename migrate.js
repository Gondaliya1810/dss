const fs = require('fs');
const path = require('path');
const { mongoose, Project, Lead, Client, Staff, Task } = require('./db');

async function migrate() {
    console.log('Starting migration to MongoDB...');

    // Helper for loading JSON files
    const loadJson = (filename) => {
        const filePath = path.join(__dirname, filename);
        if (!fs.existsSync(filePath)) {
            console.log(`File ${filename} does not exist, skipping.`);
            return [];
        }
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(content || '[]');
        } catch (err) {
            console.error(`Error reading ${filename}:`, err);
            return [];
        }
    };

    try {
        // 1. Migrate Projects
        const projects = loadJson('projects.json');
        console.log(`Loaded ${projects.length} projects from projects.json.`);
        for (const proj of projects) {
            await Project.updateOne(
                { id: proj.id },
                { $setOnInsert: proj },
                { upsert: true }
            );
        }
        console.log('Projects migration complete.');

        // 2. Migrate Leads
        const leads = loadJson('leads.json');
        console.log(`Loaded ${leads.length} leads from leads.json.`);
        for (const lead of leads) {
            await Lead.updateOne(
                { id: lead.id },
                { $setOnInsert: lead },
                { upsert: true }
            );
        }
        console.log('Leads migration complete.');

        // 3. Migrate Clients
        const clients = loadJson('clients.json');
        console.log(`Loaded ${clients.length} clients from clients.json.`);
        for (const client of clients) {
            await Client.updateOne(
                { id: client.id },
                { $setOnInsert: client },
                { upsert: true }
            );
        }
        console.log('Clients migration complete.');

        // 4. Migrate Staff
        const staff = loadJson('staff.json');
        console.log(`Loaded ${staff.length} staff members from staff.json.`);
        for (const member of staff) {
            await Staff.updateOne(
                { id: member.id },
                { $setOnInsert: member },
                { upsert: true }
            );
        }
        console.log('Staff migration complete.');

        // 5. Migrate Tasks
        const tasks = loadJson('tasks.json');
        console.log(`Loaded ${tasks.length} tasks from tasks.json.`);
        for (const task of tasks) {
            await Task.updateOne(
                { id: task.id },
                { $setOnInsert: task },
                { upsert: true }
            );
        }
        console.log('Tasks migration complete.');

        console.log('Data migration finished successfully!');
    } catch (err) {
        console.error('Migration error:', err);
    } finally {
        await mongoose.connection.close();
        console.log('MongoDB connection closed.');
    }
}

migrate();
