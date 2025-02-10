# HyperJots - Secure Departmental Note Sharing with Hyperledger Fabric  

## Prerequisites  
Before running this application, ensure you have the following installed:  
- **Docker Desktop** (Ensure Docker Daemon is running)  
- **Node.js** (for frontend & backend)  
- **Git** (to clone the repository)  

## Installation & Setup  

### 1️⃣ Clone the Repository  
```sh
git clone https://https://github.com/nikil-sri-shen/HyperJots
cd HyperJots
```
### 2️⃣ Deploy the Hyperledger Fabric Network
Run the deploy.sh script to set up the blockchain network.
```sh
./deploy.sh
```
### 3️⃣ Start the Frontend
Move to the hyperjots-frontend directory and start the React app.
```sh
cd hyperjots-frontend  
npm install  # Install dependencies  
npm run start
```

### 4️⃣ Start the Backend
Move to the hyperjots-backend directory and run the Node.js server.
```sh
cd ../hyperjots-backend  
npm install  # Install dependencies  
node server.js  
```

### 🎯 Features
- ✅ Hyperledger Fabric for secure and private note-sharing
- ✅ ReactJS frontend for a user-friendly interface
- ✅ Smart contract-based note management
- ✅ REST API integration for seamless interactions

### 🚀 Future Enhancements
- 🔐 User authentication (JWT-based login)
- 🎨 UI enhancements (Material UI / Tailwind)
- 📡 Multi-channel support for different departments

### 📌 Contribution & Feedback
Feel free to fork the repo, submit PRs, or share feedback! Let's build together.

💬 Questions? Reach out! 🚀
