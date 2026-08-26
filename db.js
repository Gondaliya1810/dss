const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Supabase URL or Key missing in environment variables.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Mongoose Compatibility Layer
class SupabaseModel {
    constructor(tableName) {
        this.tableName = tableName;
    }

    createInstance(data) {
        const tableName = this.tableName;
        // Return a new object with mongoose-like .save()
        const instance = {
            ...data,
            save: async function() {
                // If there's an id, upsert it. Otherwise insert.
                const { data: savedData, error } = await supabase
                    .from(tableName)
                    .upsert(this)
                    .select()
                    .single();
                if (error) throw new Error(error.message);
                Object.assign(this, savedData);
                return this;
            }
        };
        return instance;
    }

    find(query = {}) {
        let chain = supabase.from(this.tableName).select('*');

        // Apply filters
        for (const [key, val] of Object.entries(query)) {
            if (val && typeof val === 'object') {
                if (val.$regex) {
                    let pattern = val.$regex.source || val.$regex;
                    if (pattern.startsWith('^')) pattern = pattern.slice(1);
                    if (pattern.endsWith('$')) pattern = pattern.slice(0, -1);
                    chain = chain.ilike(key, pattern);
                }
            } else {
                if (key.includes('.')) {
                    // Nested field: e.g. 'assignedTo.id' -> 'assignedTo->>id'
                    const pgKey = key.replace('.', '->>');
                    chain = chain.eq(pgKey, val);
                } else {
                    chain = chain.eq(key, val);
                }
            }
        }

        // Return a thenable query wrapper to support chaining (.sort() and await)
        const queryWrapper = {
            sort: function(sortObj) {
                for (const [sortKey, sortVal] of Object.entries(sortObj)) {
                    const ascending = sortVal === 1 || sortVal === 'asc';
                    chain = chain.order(sortKey, { ascending });
                }
                return this;
            },
            then: async function(onFulfilled, onRejected) {
                try {
                    const { data, error } = await chain;
                    if (error) throw error;
                    return onFulfilled(data || []);
                } catch (err) {
                    if (onRejected) return onRejected(err);
                    throw err;
                }
            }
        };

        return queryWrapper;
    }

    async findOne(query = {}) {
        let chain = supabase.from(this.tableName).select('*');
        for (const [key, val] of Object.entries(query)) {
            if (val && typeof val === 'object' && val.$regex) {
                let pattern = val.$regex.source || val.$regex;
                if (pattern.startsWith('^')) pattern = pattern.slice(1);
                if (pattern.endsWith('$')) pattern = pattern.slice(0, -1);
                chain = chain.ilike(key, pattern);
            } else {
                if (key.includes('.')) {
                    const pgKey = key.replace('.', '->>');
                    chain = chain.eq(pgKey, val);
                } else {
                    chain = chain.eq(key, val);
                }
            }
        }
        const { data, error } = await chain.maybeSingle();
        if (error) throw error;
        return data ? this.createInstance(data) : null;
    }

    async countDocuments(query = {}) {
        let chain = supabase.from(this.tableName).select('*', { count: 'exact', head: true });
        for (const [key, val] of Object.entries(query)) {
            if (key.includes('.')) {
                const pgKey = key.replace('.', '->>');
                chain = chain.eq(pgKey, val);
            } else {
                chain = chain.eq(key, val);
            }
        }
        const { count, error } = await chain;
        if (error) throw error;
        return count || 0;
    }

    async deleteOne(query = {}) {
        let chain = supabase.from(this.tableName).delete();
        for (const [key, val] of Object.entries(query)) {
            if (key.includes('.')) {
                const pgKey = key.replace('.', '->>');
                chain = chain.eq(pgKey, val);
            } else {
                chain = chain.eq(key, val);
            }
        }
        const { error } = await chain;
        if (error) throw error;
        return { deletedCount: 1 };
    }

    async findOneAndUpdate(query = {}, updateObj = {}, options = {}) {
        const actualUpdate = updateObj.$set ? updateObj.$set : updateObj;

        let chain = supabase.from(this.tableName).update(actualUpdate);
        for (const [key, val] of Object.entries(query)) {
            if (key.includes('.')) {
                const pgKey = key.replace('.', '->>');
                chain = chain.eq(pgKey, val);
            } else {
                chain = chain.eq(key, val);
            }
        }
        const { data, error } = await chain.select().maybeSingle();
        if (error) throw error;
        return data ? this.createInstance(data) : null;
    }
}

function createModel(tableName) {
    const modelInstance = new SupabaseModel(tableName);
    
    function Model(data) {
        return modelInstance.createInstance(data);
    }

    Model.find = (query) => modelInstance.find(query);
    Model.findOne = (query) => modelInstance.findOne(query);
    Model.countDocuments = (query) => modelInstance.countDocuments(query);
    Model.deleteOne = (query) => modelInstance.deleteOne(query);
    Model.findOneAndUpdate = (query, update, options) => modelInstance.findOneAndUpdate(query, update, options);

    return Model;
}

// Instantiate Models
const Project = createModel('projects');
const Lead = createModel('leads');
const Client = createModel('clients');
const Staff = createModel('staff');
const Task = createModel('tasks');
const Package = createModel('packages');
const Attendance = createModel('attendance');
const BrandLogo = createModel('brand_logos');
const Review = createModel('reviews');
const Chat = createModel('chats');

// Seeding logic on server startup
async function seedDatabase() {
    try {
        await seedPackages();
        await seedBrandLogos();
        await seedReviews();
    } catch (err) {
        console.error('Supabase database seeding error:', err);
    }
}

async function seedPackages() {
    try {
        const { error, count } = await supabase
            .from('packages')
            .select('*', { count: 'exact', head: true });
            
        if (error) return;
        if (count > 0) return;

        const defaultPackages = [
            {
                id: 'starter',
                name: 'Standard Posts',
                price: '₹15k/mo',
                description: '12 High-Quality Graphics\nCaption & Hook Writing\nBrand Colors Integration\n2 Revision Rounds\nx No Video/Reels Editing'
            },
            {
                id: 'growth',
                name: 'Growth Accelerator',
                price: '₹35k/mo',
                description: '15 Custom Graphics / Carousels\n8 Professional Reels / Video Cuts\nTrending Audios & Topic Research\nSound FX & Subtitles\nDedicated Manager Support'
            },
            {
                id: 'enterprise',
                name: 'Full Content Suite',
                price: '₹60k/mo',
                description: 'Unlimited Posts & Carousels\n15 Custom Premium Reels\nScriptwriting & Hook Strategy\nComplete Social Media Calendar\nThumbnail & Banner Designs'
            }
        ];

        await supabase.from('packages').insert(defaultPackages);
        console.log('Seeded default packages to Supabase.');
    } catch (err) {
        console.error('Error seeding packages:', err);
    }
}

async function seedBrandLogos() {
    try {
        const { error, count } = await supabase
            .from('brand_logos')
            .select('*', { count: 'exact', head: true });
            
        if (error) return;
        if (count > 0) return;

        const defaultLogos = [
            { id: 'logo-1', darkImagePath: './image/client-1.png', lightImagePath: './image/client-1.png', name: 'Brand 1' },
            { id: 'logo-2', darkImagePath: './image/client-2.png', lightImagePath: './image/client-2.png', name: 'Brand 2' },
            { id: 'logo-3', darkImagePath: './image/client-3.png', lightImagePath: './image/client-3.png', name: 'Brand 3' },
            { id: 'logo-4', darkImagePath: './image/client-4.png', lightImagePath: './image/client-4.png', name: 'Brand 4' },
            { id: 'logo-5', darkImagePath: './image/client-5.png', lightImagePath: './image/client-5.png', name: 'Brand 5' },
            { id: 'logo-6', darkImagePath: './image/client-6.png', lightImagePath: './image/client-6.png', name: 'Brand 6' },
            { id: 'logo-7', darkImagePath: './image/client-7.png', lightImagePath: './image/client-7.png', name: 'Brand 7' },
            { id: 'logo-8', darkImagePath: './image/client-8.png', lightImagePath: './image/client-8.png', name: 'Brand 8' }
        ];

        await supabase.from('brand_logos').insert(defaultLogos);
        console.log('Seeded default brand logos to Supabase.');
    } catch (err) {
        console.error('Error seeding brand logos:', err);
    }
}

async function seedReviews() {
    try {
        const { error, count } = await supabase
            .from('reviews')
            .select('*', { count: 'exact', head: true });
            
        if (error) return;
        if (count > 0) return;

        const defaultReviews = [
            {
                id: 'rev-1',
                name: 'kumbhani daksh',
                rating: 5,
                text: 'Excellent work with outstanding quality! I really loved this kankotri and card design. The service was also very good and Amazing.',
                source: 'Google Review',
                avatarInitials: 'KD'
            },
            {
                id: 'rev-2',
                name: 'Crispy Crave',
                rating: 4,
                text: 'We hired Design Shaper Studio for video editing and digital marketing services, and the results exceeded our expectations. Their creativity, quick response time, and dedication to quality make them a great partner for business growth.',
                source: 'Google Review',
                avatarInitials: 'CC'
            },
            {
                id: 'rev-3',
                name: 'Monark Kheni',
                rating: 5,
                text: 'Design Shaper Studio provides excellent graphic design and digital marketing services. Their team is highly professional and creative. They designed our social media posts and branding materials perfectly according to our requirements. Highly recommended for logo design, social media management, packaging design, and digital marketing services in Surat Fabulous Work Great Job 👍',
                source: 'Google Review',
                avatarInitials: 'MK'
            },
            {
                id: 'rev-4',
                name: 'Bhajman Shree Radhe Pareevar',
                rating: 5,
                text: 'Amazing experience with Design Shaper Studio! Their graphic design work is creative, professional, and exactly matches our brand requirements. From social media posts to promotional materials, every design is delivered with great attention to detail. Highly recommended.',
                source: 'Google Review',
                avatarInitials: 'BR'
            },
            {
                id: 'rev-5',
                name: 'riddhi Radadiya',
                rating: 5,
                text: 'We have worked with Design Shaper Studio and are very satisfied with their work. Their service is very fast, and the quality of work is excellent. Highly recommended! 👍✨',
                source: 'Google Review',
                avatarInitials: 'RR'
            },
            {
                id: 'rev-6',
                name: 'Creative',
                rating: 5,
                text: 'I got my logo designed by Shaper Studio and I\'m beyond happy with the result! The team was super creative and understood my vision perfectly. They turned my ideas into a beautiful, professional logo that really represents my brand. Their creativity, communication, and design sense are top-notch. Highly recommended to anyone looking for high-quality and unique design work!',
                source: 'Google Review',
                avatarInitials: 'CR'
            },
            {
                id: 'rev-7',
                name: 'Darshan Senjariya',
                rating: 5,
                text: 'We appreciate your work. we are getting service last a long time we are satisfied with Design Shaper Studio. we are recommended for Good Creativity as per Market and client demand so if you are planning for digital marketing content and graphics design one must try to design Shaper studio.',
                source: 'Google Review',
                avatarInitials: 'DS'
            },
            {
                id: 'rev-8',
                name: 'Raj',
                rating: 5,
                text: 'Hi, I\'m Raj Gohil, owner of 11za infotec Our social media feed looks more creative and professional than ever—all thanks to the amazing work by Design Shaper Studio. They delivered high-quality graphics and social media services that fit perfectly within our budget!',
                source: 'Google Review',
                avatarInitials: 'RJ'
            },
            {
                id: 'rev-9',
                name: 'jaydip ahir',
                rating: 4,
                text: 'My name is jaydeep ahir, and my business name is Book My world , i have a creative graphics on my social media feed becuse of the deisgn shaper studio\'s, they provid me a graphics and social media services in my budget. so thank you design shaper',
                source: 'Google Review',
                avatarInitials: 'JA'
            }
        ];

        await supabase.from('reviews').insert(defaultReviews);
        console.log('Seeded default reviews to Supabase.');
    } catch (err) {
        console.error('Error seeding reviews:', err);
    }
}

// Run seeds
seedDatabase();

module.exports = {
    supabase,
    Project,
    Lead,
    Client,
    Staff,
    Task,
    Package,
    Attendance,
    BrandLogo,
    Review,
    Chat
};
