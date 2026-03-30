# Decentralized Health Management System - React + Flask

A modern web application that replaces the Streamlit interface with a React frontend and Flask backend for managing blockchain-based health records.

## Architecture

- **Frontend**: React with Vite, modern UI with Lucide icons
- **Backend**: Flask REST API with CORS support
- **Blockchain**: Ethereum smart contract for data integrity
- **Storage**: Local file system with blockchain hash verification

## Features

- 🏥 Patient data collection and upload to blockchain
- 🔍 Secure record querying with hash verification
- 📊 Real-time blockchain status monitoring
- 📁 File preview (images, PDFs, text files)
- ⬇️ Direct file downloads
- 🎨 Professional responsive UI

## Prerequisites

1. **Ganache** running locally (http://127.0.0.1:7545)
2. **Node.js** (v18 or higher)
3. **Python** (v3.8 or higher)
4. **Smart contract deployed** (run `deploy_contract.py` first)

## Setup Instructions

### 1. Backend Setup

```bash
cd backend
pip install -r requirements.txt
python app.py
```

The Flask server will start on `http://localhost:5000`

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The React app will start on `http://localhost:5173`

### 3. Smart Contract Deployment (if not already done)

```bash
cd backend
python deploy_contract.py
```

## API Endpoints

### Health Check
- `GET /api/health` - Check API status

### Data Collection
- `POST /api/collect-data` - Simulate sensor data collection and upload
  ```json
  {
    "patient_id": "patient001"
  }
  ```

### Record Query
- `POST /api/query-records` - Retrieve patient records
  ```json
  {
    "patient_id": "patient001"
  }
  ```

### File Download
- `GET /api/download-file/<filename>` - Download specific file

### Blockchain Status
- `GET /api/blockchain-status` - Check blockchain connection

## File Structure

```
SOURCE CODE/
├── backend/
│   ├── app.py              # Flask API server
│   ├── deploy_contract.py  # Smart contract deployment
│   ├── contract_address.json # Contract info
│   └── requirements.txt    # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # Main React component
│   │   └── App.css        # Professional styling
│   ├── package.json       # Node dependencies
│   └── vite.config.js     # Vite configuration
└── Patient_Data/          # Patient file storage
```

## Key Differences from Streamlit

### Streamlit → React/Flask Migration

| Streamlit Feature | React/Flask Equivalent |
|------------------|----------------------|
| `st.button()` | React button with onClick handler |
| `st.text_input()` | HTML input with React state |
| `st.success/error/warning()` | Message components with styling |
| `st.progress()` | Custom progress bar component |
| Session state | React useState hooks |
| File display | Base64 encoding and conditional rendering |
| Auto-refresh | Manual API calls with useEffect |

### Advantages of New Architecture

1. **Better Performance**: React's virtual DOM and efficient updates
2. **Modern UI**: Professional design with smooth animations
3. **API Separation**: Clean separation between frontend and backend
4. **Scalability**: Easy to add new features and endpoints
5. **Mobile Responsive**: Works well on all device sizes
6. **Better Debugging**: Standard web development tools

## Usage

1. Start both backend and frontend servers
2. Open browser to `http://localhost:5173`
3. Enter patient ID and click "Verify Patient" to collect data
4. Use "Query Records" to retrieve and view patient records
5. View file previews or download files directly

## Development

### Adding New Features

1. **Backend**: Add new endpoints in `app.py`
2. **Frontend**: Create new components and update `App.jsx`
3. **Styling**: Modify `App.css` for UI changes

### Debugging

- Backend logs show in terminal where Flask is running
- Frontend debugging with browser dev tools
- Network tab shows API calls and responses

## Security Notes

- Patient data folder path is hardcoded (update as needed)
- Blockchain connection uses first Ganache account
- CORS enabled for development (restrict in production)
- File access limited to specific directory

## Troubleshooting

1. **Blockchain connection error**: Ensure Ganache is running
2. **Contract not found**: Run `deploy_contract.py` first
3. **CORS errors**: Check both servers are running
4. **File not found**: Verify Patient_Data folder exists

## Future Enhancements

- [ ] User authentication system
- [ ] Multiple blockchain network support
- [ ] Real-time WebSocket updates
- [ ] File upload via UI
- [ ] Advanced search and filtering
- [ ] Data visualization dashboard
