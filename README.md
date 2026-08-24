# DesignShaperStudio (DSS)

A premium portfolio website and lead management admin dashboard for **Design Shaper Studio**, a specialized agency for social media posts, reels, branding, and graphics design.

---

## 🛠️ Technology Stack

This application is built with a lightweight, high-performance, and modular stack to ensure fast load times and clean organization.

### 1. Frontend (Client-side)
* **Core Languages**: Semantic HTML5, Vanilla JavaScript, and Custom CSS.
* **Layout & Grid**: [Bootstrap 5.3.3](https://getbootstrap.com/) for fluid grid layouts, layout helpers, and basic component structures.
* **Icons**: [FontAwesome 6.5.1](https://fontawesome.com/) for a rich library of vector icons.
* **Sliders & Carousels**: [Swiper 11](https://swiperjs.com/) for high-performance touch sliders and media carousels.
* **Key Features**:
  * Persistent Light/Dark theme setting (saved via `localStorage`).
  * Interactive portfolio sliders and video embeds.
  * Dynamically loaded service details and pricing sections.

### 2. Backend (Server-side)
* **Runtime**: [Node.js](https://nodejs.org/)
* **Application Framework**: [Express.js (v5.2.1)](https://expressjs.com/) for routing, static file hosting, and JSON API endpoints.
* **File Upload Handling**: [Multer](https://github.com/expressjs/multer) with custom storage configuration, restricting files to 20MB and accepting format filters (`jpeg|jpg|png|gif|webp|mp4|webm`).
* **Environment Configuration**: [dotenv](https://github.com/motdotla/dotenv) for managing port configurations and administrative credentials.
* **Image Processing**: [pngjs](https://github.com/lukeapage/pngjs) for low-level PNG pixel handling or metadata read/writes.
* **Cross-Origin Requests**: [CORS](https://github.com/expressjs/cors) middleware enabled for flexibility.

### 3. Database & Storage
* **Local JSON Store**:
  * [`leads.json`](file:///d:/DSS-DesignShaperStudio/leads.json): Stores contact submissions and lead details (automatically initializes unique IDs and pending statuses).
  * [`projects.json`](file:///d:/DSS-DesignShaperStudio/projects.json): Stores information about portfolio items.
* **Media Assets**:
  * Uploaded images and videos are written directly to `public/uploads/` via Multer storage.

---

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (version 16 or higher recommended).

### Installation
1. Clone or copy the project files to your local directory.
2. Install the package dependencies:
   ```bash
   npm install
   ```

### Configuration
Create a `.env` file in the root directory if it does not already exist:
```env
PORT=8080
ADMIN_USER=admin
ADMIN_PASS=admin123
```

### Running the Application
Start the Node server:
```bash
node server.js
```
The server will start up, and the website will be accessible locally at `http://localhost:8080` (or whichever port you specified in `.env`).

---

## 📂 Directory Structure

* **`server.js`**: Core backend API endpoints and routing logic.
* **`public/`**: Static frontend application files.
  * **`index.html`**: The home page containing banners, sliders, and navigation.
  * **`admin.html`**: The secure admin dashboard for managing leads and projects.
  * **`css/style.css`**: Main stylesheet containing modern aesthetic variables and animations.
  * **`js/`**: Client-side logic for sliders, theme-switching, contact form submissions, and admin panels.
