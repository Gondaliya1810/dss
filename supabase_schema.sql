-- DSS Supabase Database Schema
-- Copy and paste this script into your Supabase SQL Editor and click 'Run'.

-- 1. Packages Table
CREATE TABLE packages (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price VARCHAR(50) NOT NULL,
    description TEXT
);

-- 2. Brand Logos Table
CREATE TABLE brand_logos (
    id VARCHAR(50) PRIMARY KEY,
    "darkImagePath" TEXT NOT NULL,
    "lightImagePath" TEXT NOT NULL,
    name VARCHAR(100),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Reviews Table
CREATE TABLE reviews (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    rating INTEGER DEFAULT 5,
    text TEXT NOT NULL,
    source VARCHAR(100) DEFAULT 'Google Review',
    "avatarInitials" VARCHAR(10),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Projects Table
CREATE TABLE projects (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    "imagePath" TEXT,
    "fileType" VARCHAR(50),
    "mediaPaths" JSONB DEFAULT '[]'::jsonb,
    "mediaTypes" JSONB DEFAULT '[]'::jsonb,
    "thumbnailPath" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Leads Table
CREATE TABLE leads (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(50) DEFAULT 'N/A',
    service VARCHAR(100) DEFAULT 'Not specified',
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Clients Table
CREATE TABLE clients (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) DEFAULT '',
    status VARCHAR(50) DEFAULT 'active',
    package JSONB DEFAULT '{}'::jsonb
);

-- 7. Staff Table
CREATE TABLE staff (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    role VARCHAR(100) NOT NULL,
    "avatarColor" VARCHAR(50),
    email VARCHAR(150) DEFAULT '',
    mobile VARCHAR(50) DEFAULT '',
    password VARCHAR(100) DEFAULT 'DSS@123'
);

-- 8. Tasks Table
CREATE TABLE tasks (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    client VARCHAR(150) NOT NULL,
    "assignedTo" JSONB NOT NULL,
    deadline VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    priority VARCHAR(50) NOT NULL,
    description TEXT,
    "submissionLink" TEXT DEFAULT '',
    "submissionComment" TEXT DEFAULT '',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Attendance Table
CREATE TABLE attendance (
    id VARCHAR(50) PRIMARY KEY,
    "staffId" VARCHAR(50) REFERENCES staff(id) ON DELETE CASCADE,
    "staffName" VARCHAR(150) NOT NULL,
    date VARCHAR(50) NOT NULL,
    "punchIn" TIMESTAMP WITH TIME ZONE NOT NULL,
    "punchOut" TIMESTAMP WITH TIME ZONE,
    "totalHours" NUMERIC DEFAULT 0,
    status VARCHAR(50) DEFAULT 'present'
);
