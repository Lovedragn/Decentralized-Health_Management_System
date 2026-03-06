import { useState, useEffect } from 'react'
import axios from 'axios'
import { Upload, Search, Activity, FileText, Download, AlertCircle, CheckCircle, Clock, Database, Loader2, Wallet, Copy, Check, User, ChevronUp, ArrowRight } from 'lucide-react'
import './App.css'

const API_BASE_URL = 'http://localhost:5000/api'

function App() {
  const [patientId, setPatientId] = useState('patient001')
  const [queryPatientId, setQueryPatientId] = useState('patient001')
  const [isCollecting, setIsCollecting] = useState(false)
  const [isQuerying, setIsQuerying] = useState(false)
  const [collectionProgress, setCollectionProgress] = useState(0)
  const [messages, setMessages] = useState([])

  // Auto-dismiss messages after 5 seconds
  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => {
        setMessages(prev => prev.slice(1)) // Remove first message after 5 seconds
      }, 5000)
      
      return () => clearTimeout(timer)
    }
  }, [messages])
  const [records, setRecords] = useState([])
  const [blockchainStatus, setBlockchainStatus] = useState(null)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [copiedAddress, setCopiedAddress] = useState(false)
  const [switchAccountMenuOpen, setSwitchAccountMenuOpen] = useState(false)

  // Profile data - will be updated with real Ganache accounts
  const [profileData, setProfileData] = useState({
    name: 'Dr. Sarah Chen',
    title: 'Blockchain Administrator',
    address: '0x4fb73937898807E94E71f707B03974c0Bf83ADA7',
    avatar: '/api/placeholder/40/40'
  })

  const profileNames = [
    'Dr. Sarah Chen',
    'Prof. Michael Roberts', 
    'Dr. Emily Watson',
    'Dr. James Wilson',
    'Dr. Lisa Anderson',
    'Prof. David Martinez',
    'Dr. Jennifer Taylor',
    'Dr. Robert Brown',
    'Dr. Maria Garcia',
    'Dr. John Davis'
  ]

  const profileTitles = [
    'Blockchain Administrator',
    'Senior Researcher',
    'Data Security Officer',
    'Medical Director',
    'System Administrator',
    'Lead Developer',
    'Compliance Officer',
    'Network Administrator',
    'Database Manager',
    'Infrastructure Engineer'
  ]

  const ganacheAccounts = [
    '0x4fb73937898807E94E71f707B03974c0Bf83ADA7',
    '0x8d5e2e6b1c5b8f9a2d3e4f5b6c7d8e9f0a1b2c3',
    '0x1a2b3c4d5e6f7890a1b2c3d4e5f67890a1b2c3d4',
    '0x5e6f7890a1b2c3d4e5f67890a1b2c3d4e5f67890',
    '0x2b3c4d5e6f7890a1b2c3d4e5f67890a1b2c3d4e5',
    '0x3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67',
    '0x4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f6789',
    '0x5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a',
    '0x67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1',
    '0x7890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b'
  ]

  const switchAccount = (accountIndex) => {
    const newProfileData = {
      name: profileNames[accountIndex],
      title: profileTitles[accountIndex],
      address: ganacheAccounts[accountIndex],
      avatar: `https://picsum.photos/seed/${ganacheAccounts[accountIndex]}/40/40.jpg`
    }
    setProfileData(newProfileData)
    setSwitchAccountMenuOpen(false)
    setProfileMenuOpen(false)
    
    // Update blockchain status to reflect new account
    if (blockchainStatus) {
      setBlockchainStatus(prev => ({
        ...prev,
        account: ganacheAccounts[accountIndex]
      }))
    }
  }

  useEffect(() => {
    checkBlockchainStatus()
  }, [])

  useEffect(() => {
    if (blockchainStatus?.account) {
      // Get account index to assign profile
      const accountIndex = parseInt(blockchainStatus.account.slice(-1), 16) % 10
      setProfileData(prev => ({
        ...prev,
        name: profileNames[accountIndex],
        title: profileTitles[accountIndex],
        address: blockchainStatus.account,
        avatar: `https://picsum.photos/seed/${blockchainStatus.account}/40/40.jpg`
      }))
    }
  }, [blockchainStatus])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuOpen && !event.target.closest('.profile-section')) {
        setProfileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [profileMenuOpen])

  const checkBlockchainStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/blockchain-status`)
      setBlockchainStatus(response.data)
    } catch (error) {
      console.error('Blockchain status check failed:', error)
    }
  }

  const addMessage = (type, content) => {
    setMessages(prev => [...prev, { type, content, id: Date.now() }])
  }

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(profileData.address)
      setCopiedAddress(true)
      setTimeout(() => setCopiedAddress(false), 2000)
    } catch (error) {
      console.error('Failed to copy address:', error)
    }
  }

  const collectPatientData = async () => {
    setIsCollecting(true)
    setMessages([])
    setCollectionProgress(0)

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setCollectionProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      const response = await axios.post(`${API_BASE_URL}/collect-data`, {
        patient_id: patientId
      })

      clearInterval(progressInterval)
      setCollectionProgress(100)

      if (response.data.status === 'success') {
        addMessage('success', response.data.message)
        response.data.upload_results?.forEach(result => {
          if (result.status === 'success') {
            addMessage('success', result.message)
          } else {
            addMessage('error', result.message)
          }
        })
      } else {
        addMessage('warning', response.data.message)
      }
    } catch (error) {
      addMessage('error', `Data collection failed: ${error.response?.data?.error || error.message}`)
    } finally {
      setIsCollecting(false)
      setTimeout(() => setCollectionProgress(0), 1000)
    }
  }

  const queryRecords = async () => {
    setIsQuerying(true)
    setMessages([])
    setRecords([])

    try {
      const response = await axios.post(`${API_BASE_URL}/query-records`, {
        patient_id: queryPatientId
      })

      if (response.data.status === 'success') {
        addMessage('success', `Found ${response.data.record_count} record(s) for patient ${queryPatientId}`)
        setRecords(response.data.records)
      } else {
        addMessage('error', response.data.error || 'Query failed')
      }
    } catch (error) {
      addMessage('error', `Query failed: ${error.response?.data?.error || error.message}`)
    } finally {
      setIsQuerying(false)
    }
  }

  const downloadFile = async (filename) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/download-file/${filename}`, {
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      addMessage('error', `Download failed: ${error.message}`)
    }
  }

  const renderFileContent = (record) => {
    if (!record.file_available || !record.file_data) {
      return (
        <div className="file-unavailable">
          <AlertCircle size={16} />
          <span>File not available</span>
        </div>
      )
    }

    if (record.mime_type?.startsWith('image/')) {
      return (
        <div className="file-preview">
          <img 
            src={`data:${record.mime_type};base64,${record.file_data}`}
            alt={record.filename}
            className="preview-image"
          />
        </div>
      )
    }

    if (record.mime_type === 'application/pdf') {
      return (
        <div className="file-preview">
          <iframe
            src={`data:application/pdf;base64,${record.file_data}`}
            className="preview-pdf"
            title={record.filename}
          />
        </div>
      )
    }

    if (record.mime_type?.startsWith('text/')) {
      return (
        <div className="file-preview">
          <pre className="preview-text">{record.file_data}</pre>
        </div>
      )
    }

    return (
      <button 
        onClick={() => downloadFile(record.filename)}
        className="download-btn"
      >
        <Download size={16} />
        Download File
      </button>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <h1>
              <Database className="header-icon" />
              Decentralized Health Management System
            </h1>
            <p className="header-subtitle">Secure blockchain-based file integrity verification system</p>
          </div>
          
          <div className="header-right">
            {/* Blockchain Status */}
            {blockchainStatus && (
              <div className={`blockchain-status-small ${blockchainStatus.status}`}>
                <div className="status-dot"></div>
                <span>
                  {blockchainStatus.status === 'connected' 
                    ? `Connected ${blockchainStatus.block_number}`
                    : 'Disconnected'
                  }
                </span>
              </div>
            )}
            
            {/* Profile Section */}
            <div className="profile-section">
              <div className="profile-trigger" onClick={() => setProfileMenuOpen(!profileMenuOpen)}>
                <img 
                  src={profileData.avatar} 
                  alt={profileData.name}
                  className="profile-avatar"
                  onError={(e) => {
                    e.target.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="%233b82f6"/><text x="20" y="25" text-anchor="middle" fill="white" font-family="Arial" font-size="14">${profileData.name.charAt(0)}</text></svg>`
                  }}
                />
                <div className="profile-info">
                  <div className="profile-name">{profileData.name}</div>
                  <div className="profile-title">{profileData.title}</div>
                </div>
              </div>
            
            {profileMenuOpen && (
              <div className="profile-menu">
                <div className="profile-menu-header">
                  <img 
                    src={profileData.avatar} 
                    alt={profileData.name}
                    className="profile-menu-avatar"
                    onError={(e) => {
                      e.target.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60"><circle cx="30" cy="30" r="30" fill="%233b82f6"/><text x="30" y="35" text-anchor="middle" fill="white" font-family="Arial" font-size="20">${profileData.name.charAt(0)}</text></svg>`
                    }}
                  />
                  <div className="profile-menu-info">
                    <h3>{profileData.name}</h3>
                    <p>{profileData.title}</p>
                  </div>
                </div>
                
                <div className="profile-menu-section">
                  <div className="wallet-info">
                    <Wallet size={16} />
                    <span>Wallet Address</span>
                  </div>
                  <div className="address-container">
                    <code className="wallet-address">{profileData.address}</code>
                    <button onClick={copyAddress} className="copy-btn">
                      {copiedAddress ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
                
                <div className="profile-menu-section">
                  <div className="status-info">
                    <div className="status-dot connected"></div>
                    <span>Connected to Blockchain</span>
                  </div>
                  {blockchainStatus && (
                    <div className="blockchain-info">
                      <span>Block: {blockchainStatus.block_number}</span>
                      <span>Network: Ganache</span>
                    </div>
                  )}
                </div>

                <div className="profile-menu-section">
                  <button 
                    className="switch-account-btn"
                    onClick={() => setSwitchAccountMenuOpen(!switchAccountMenuOpen)}
                  >
                    <User size={16} />
                    <span>Switch Account</span>
                    <ChevronUp size={14} className={`chevron-icon ${switchAccountMenuOpen ? 'rotated' : ''}`} />
                  </button>
                  
                  {switchAccountMenuOpen && (
                    <div className="switch-account-menu">
                      {ganacheAccounts.map((account, index) => (
                        <button
                          key={account}
                          className="account-option"
                          onClick={() => switchAccount(index)}
                        >
                          <img 
                            src={`https://picsum.photos/seed/${account}/32/32.jpg`}
                            alt={profileNames[index]}
                            className="account-avatar"
                          />
                          <div className="account-info">
                            <div className="account-name">{profileNames[index]}</div>
                            <div className="account-title">{profileTitles[index]}</div>
                            <div className="account-address">{account.slice(0, 6)}...{account.slice(-4)}</div>
                          </div>
                          {profileData.address === account && (
                            <Check size={16} className="current-account" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </header>

      <div className="main-content">
        <div className="left-panel">
          <section className="section">
            <h2>
              <Activity className="section-icon" />
              Patient Data Collection
            </h2>
            <div className="input-group">
              <label htmlFor="patient-id">Patient ID</label>
              <input
                id="patient-id"
                type="text"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                placeholder="Enter patient identifier"
                className="text-input"
              />
            </div>
            <button
              onClick={collectPatientData}
              disabled={isCollecting}
              className="primary-btn"
            >
              {isCollecting ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Collecting Data...
                </>
              ) : (
                <>
                  <Upload size={20} />
                  Verify
                </>
              )}
            </button>
            {isCollecting && (
              <div className="progress-container">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${collectionProgress}%` }}
                  ></div>
                </div>
                <div className="progress-text">
                  {collectionProgress > 0 && `Processing... ${collectionProgress}%`}
                  {collectionProgress === 0 && 'Initializing...'}
                </div>
              </div>
            )}
          </section>

          <section className="section">
            <h2>
              <Search className="section-icon" />
              Query Records
            </h2>
            <button
              onClick={queryRecords}
              disabled={isQuerying}
              className="primary-btn"
            >
              {isQuerying ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Querying...
                </>
              ) : (
                <>
                  <Search size={20} />
                  Query
                </>
              )}
            </button>
          </section>
        </div>

        <div className="right-panel">
          <section className="output-section">
            <h2>
              <FileText className="section-icon" />
              Output Console
            </h2>
            
            <div className="messages-container">
              {messages.length === 0 && records.length === 0 ? (
                <div className="empty-state">
                  <FileText size={48} className="empty-icon" />
                  <p>No output yet. Perform an action to see results.</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className={`message message-${message.type}`}>
                    <div className="message-icon">
                      {message.type === 'success' && <CheckCircle size={16} />}
                      {message.type === 'error' && <AlertCircle size={16} />}
                      {message.type === 'warning' && <AlertCircle size={16} />}
                    </div>
                    <span className="message-content">{message.content}</span>
                  </div>
                ))
              )}
            </div>

            {records.length > 0 && (
              <div className="records-container">
                <h3>Retrieved Records</h3>
                {records.map((record) => (
                  <div key={record.index} className="record-card">
                    <div className="record-header">
                      <h4>Record {record.index}</h4>
                      <div className="record-meta">
                        <Clock size={14} />
                        <span>{record.readable_timestamp}</span>
                      </div>
                    </div>
                    <div className="record-details">
                      <p><strong>Hash:</strong> <code>{record.hash}</code></p>
                      <p><strong>Filename:</strong> {record.filename}</p>
                      {record.file_available && (
                        <p><strong>Size:</strong> {(record.file_size / 1024).toFixed(2)} KB</p>
                      )}
                    </div>
                    {record.filename && (
                      <div className="record-file">
                        {renderFileContent(record)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

export default App
