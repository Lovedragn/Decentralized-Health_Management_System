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
  const [records, setRecords] = useState([])
  const [blockchainStatus, setBlockchainStatus] = useState(null)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [copiedAddress, setCopiedAddress] = useState(false)
  const [switchAccountMenuOpen, setSwitchAccountMenuOpen] = useState(false)
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false)
  const [whatsAppNumber, setWhatsAppNumber] = useState('')
  const [highTempFile, setHighTempFile] = useState(null)

  // Profile data - will be updated with real Ganache accounts
  const [profileData, setProfileData] = useState({
    name: 'Dr. Sarah Chen',
    title: 'Blockchain Administrator',
    address: '0x4fb73937898807E94E71f707B03974c0Bf83ADA7',
    avatar: '/api/placeholder/40/40',
    whatsAppNumber: '+1234567890'
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

  const profileWhatsAppNumbers = [
    '+1234567890',
    '+1987654321',
    '+1122334455',
    '+1555666777',
    '+1444333222',
    '+1777888999',
    '+1666555444',
    '+1999888777',
    '+1333444555',
    '+1555222333'
  ]

  const ganacheAccounts = [
    '0x4fb73937898807E94E71f707B03974c0Bf83ADA7',
    '0x58997951b126b7683Af5cbd2B12591df30e12339',
    '0xE6F8256aE1d328246155C6b0A7e5150613D80B8f',
    '0x7bd66262DBeE5d575cB31b08ea364a6A572bF491',
    '0x1a24502A50C3548B1dC9A5f67cC7028E07eA30D9',
    '0x94EF3538AdD827282f240663391e6a6BB57B5dd1',
    '0xfE73F50E1D3a01506227700c5BEF4556C9473f58',
    '0xFbCf5523F376BD8517b7a16cB14eDd7a83410fc0',
    '0xd5C93938A7E84b3f558d4f463E7f9034AF9c7FEe',
    '0x0e328d2f7993D9Ab850Ff3f6786Bab21095034E5'
  ]

  // Function to check temperature in file content
  const checkTemperatureInFile = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target.result.toLowerCase()
        
        // Look for temperature patterns
        const tempPatterns = [
          /body temperature[:\s]*(\d+\.?\d*)[°f]?/i,
          /temperature[:\s]*(\d+\.?\d*)[°f]?/i,
          /temp[:\s]*(\d+\.?\d*)[°f]?/i,
          /fever[:\s]*(\d+\.?\d*)[°f]?/i
        ]
        
        let temperature = null
        for (const pattern of tempPatterns) {
          const match = content.match(pattern)
          if (match) {
            temperature = parseFloat(match[1])
            break
          }
        }
        
        // Check if temperature is higher than normal (98.6°F or 37°C)
        const isHighTemp = temperature && (
          (temperature > 98.6 && temperature < 200) || // Fahrenheit
          (temperature > 37 && temperature < 50)     // Celsius
        )
        
        resolve({ temperature, isHighTemp })
      }
      reader.readAsText(file)
    })
  }

  // Function to send WhatsApp notification
  const sendWhatsAppNotification = async (phoneNumber, temperature, fileName) => {
    try {
      // Create the WhatsApp message
      const message = `🚨 High Temperature Alert!\n\nFile: ${fileName}\nTemperature: ${temperature}°F\nPatient ID: ${patientId}\n\nPlease review the medical record immediately.`
      
      // Method 1: Use Edge WhatsApp Auto Sender extension (PRIMARY METHOD)
      if (window.whatsappAutoSender) {
        try {
          setMessages(prev => [...prev, {
            type: 'info',
            text: '🔧 Edge WhatsApp Auto Sender extension detected! Using extension for auto-send...'
          }])
          
          const result = await window.whatsappAutoSender.send({
            phone: phoneNumber.replace(/[+\s()-]/g, ''),
            message: message
          })
          
          if (result.success) {
            setMessages(prev => [...prev, {
              type: 'success',
              text: `✅ WhatsApp notification sent automatically via Edge extension to ${phoneNumber} for high temperature (${temperature}°F)`
            }])
            return
          } else {
            setMessages(prev => [...prev, {
              type: 'warning',
              text: `Edge extension method failed: ${result.error}. Trying fallback...`
            }])
          }
        } catch (error) {
          setMessages(prev => [...prev, {
            type: 'warning',
            text: `Edge extension error: ${error.message}. Trying fallback...`
          }])
        }
      }
      
      // Method 2: Try Edge-specific extension APIs
      if (window.edgeWhatsAppSender) {
        try {
          await window.edgeWhatsAppSender.sendMessage(phoneNumber.replace(/[+\s()-]/g, ''), message)
          setMessages(prev => [...prev, {
            type: 'success',
            text: `✅ WhatsApp sent via Edge WhatsApp Sender extension to ${phoneNumber}`
          }])
          return
        } catch (error) {
          console.log('Edge WhatsApp Sender extension failed')
        }
      }
      
      // Method 3: Try other common extension APIs
      if (window.waSender) {
        try {
          await window.waSender.sendMessage(phoneNumber.replace(/[+\s()-]/g, ''), message)
          setMessages(prev => [...prev, {
            type: 'success',
            text: `✅ WhatsApp sent via WA Sender extension to ${phoneNumber}`
          }])
          return
        } catch (error) {
          console.log('WA Sender extension failed')
        }
      }
      
      if (window.whatsappWebSender) {
        try {
          await window.whatsappWebSender.autoSend(phoneNumber.replace(/[+\s()-]/g, ''), message)
          setMessages(prev => [...prev, {
            type: 'success',
            text: `✅ WhatsApp sent via Web Sender extension to ${phoneNumber}`
          }])
          return
        } catch (error) {
          console.log('WhatsApp Web Sender extension failed')
        }
      }
      
      // Method 4: Check for Edge extension content script injection
      if (document.querySelector('#whatsapp-auto-sender-extension') || 
          document.querySelector('[data-extension="whatsapp-auto-sender"]')) {
        setMessages(prev => [...prev, {
          type: 'info',
          text: '🔧 Edge WhatsApp Auto Sender content script detected. Triggering auto-send...'
        }])
        
        // Try to trigger the extension via custom event
        const event = new CustomEvent('whatsappAutoSend', {
          detail: { phone: phoneNumber.replace(/[+\s()-]/g, ''), message }
        })
        document.dispatchEvent(event)
        
        // Wait a moment for the extension to process
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        setMessages(prev => [...prev, {
          type: 'success',
          text: `✅ WhatsApp auto-send triggered via Edge extension content script`
        }])
        return
      }
      
      // Method 5: Fallback to popup method
      setMessages(prev => [...prev, {
        type: 'warning',
        text: '⚠️ Edge WhatsApp Auto Sender extension not responding. Using fallback popup method...'
      }])
      
      const popup = window.open('', '_blank', 'width=800,height=600')
      
      if (popup) {
        // Write HTML with auto-send script and Edge-specific instructions
        popup.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>WhatsApp Auto Sender - Edge Extension</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { margin: 0; padding: 20px; font-family: Arial, sans-serif; background: #f0f0f0; }
              .container { max-width: 400px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .status { text-align: center; margin: 20px 0; font-weight: bold; }
              .loading { color: #666; }
              .success { color: #25d366; }
              .error { color: #dc3545; }
              .auto-send-info { background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 10px 0; }
              .extension-note { background: #0078d4; color: white; padding: 15px; border-radius: 5px; margin: 10px 0; }
              .edge-logo { font-size: 24px; margin-bottom: 10px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h2>🤖 WhatsApp Auto Sender</h2>
              <div class="status loading" id="status">Initializing WhatsApp...</div>
              <div class="extension-note">
                <div class="edge-logo">�</div>
                <strong>Edge Extension User:</strong><br>
                Make sure your "WhatsApp Auto Sender" extension is enabled and has proper permissions for WhatsApp Web.
              </div>
              <div class="auto-send-info">
                <strong>Auto-sending message to:</strong><br>
                ${phoneNumber}<br><br>
                <strong>Message:</strong><br>
                ${message.replace(/\n/g, '<br>')}
              </div>
            </div>
            
            <script>
              // Check for Edge extensions
              if (window.whatsappAutoSender || window.edgeWhatsAppSender || window.waSender || window.whatsappWebSender) {
                document.getElementById('status').innerHTML = '🔧 Edge extension detected! Using extension...';
                setTimeout(() => {
                  window.close();
                }, 1000);
              } else {
                // Auto-redirect to WhatsApp
                setTimeout(() => {
                  document.getElementById('status').innerHTML = '📱 Opening WhatsApp Web...';
                  window.location.href = 'https://web.whatsapp.com/send?phone=${phoneNumber.replace(/[+\s()-]/g, '')}&text=${encodeURIComponent(message)}';
                  
                  // Try to auto-send after WhatsApp loads
                  setTimeout(() => {
                    try {
                      const sendButton = document.querySelector('[data-testid="send"], button[aria-label*="Send"], button[type="submit"]');
                      if (sendButton && !sendButton.disabled) {
                        sendButton.click();
                        document.getElementById('status').innerHTML = '✅ Message sent automatically!';
                        document.getElementById('status').className = 'status success';
                        
                        setTimeout(() => {
                          window.close();
                        }, 2000);
                      } else {
                        document.getElementById('status').innerHTML = '⚠️ Please click send manually or check Edge extension';
                        document.getElementById('status').className = 'status error';
                      }
                    } catch (error) {
                      document.getElementById('status').innerHTML = '⚠️ Please click send manually or check Edge extension';
                      document.getElementById('status').className = 'status error';
                    }
                  }, 3000);
                }, 1000);
              }
            </script>
          </body>
          </html>
        `)
        
        setMessages(prev => [...prev, {
          type: 'info',
          text: 'Edge-specific fallback popup opened - attempting automatic send'
        }])
        
      } else {
        // Final fallback to regular WhatsApp Web
        const whatsappUrl = `https://wa.me/${phoneNumber.replace(/[+\s()-]/g, '')}?text=${encodeURIComponent(message)}`
        window.open(whatsappUrl, '_blank')
        
        setMessages(prev => [...prev, {
          type: 'warning',
          text: `⚠️ Edge extension not working. WhatsApp opened manually for ${phoneNumber} - please click send`
        }])
      }
      
    } catch (error) {
      setMessages(prev => [...prev, {
        type: 'error',
        text: `❌ Failed to send WhatsApp notification: ${error.message}`
      }])
    }
  }

  const switchAccount = (accountIndex) => {
    const newProfileData = {
      name: profileNames[accountIndex],
      title: profileTitles[accountIndex],
      address: ganacheAccounts[accountIndex],
      avatar: `https://picsum.photos/seed/${ganacheAccounts[accountIndex]}/40/40.jpg`,
      whatsAppNumber: profileWhatsAppNumbers[accountIndex]
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
    if (!patientId.trim()) {
      setMessages(prev => [...prev, {
        type: 'error',
        text: 'Please enter a patient ID'
      }])
      return
    }

    setIsCollecting(true)
    setCollectionProgress(0)
    setMessages([])

    try {
      // Simulate file upload with temperature checking
      const simulateFileUpload = async () => {
        // Create a sample file for demonstration
        const sampleFile = new File([
          `Patient ID: ${patientId}\nDate: ${new Date().toISOString()}\nBody Temperature: 99.2°F\nHeart Rate: 72 bpm\nBlood Pressure: 120/80 mmHg\nDiagnosis: Patient shows elevated body temperature\n\nMedical Notes:\nPatient presents with symptoms of fever.\nBody temperature reading indicates potential infection.\nRecommended further observation and testing.`
        ], `medical_record_${patientId}.txt`, { type: 'text/plain' })

        // Check temperature in the file
        const { temperature, isHighTemp } = await checkTemperatureInFile(sampleFile)
        
        if (isHighTemp) {
          // Automatically send WhatsApp notification
          await sendWhatsAppNotification(
            profileData.whatsAppNumber,
            temperature,
            sampleFile.name
          )
          
          setMessages(prev => [...prev, {
            type: 'warning',
            text: `High temperature detected: ${temperature}°F. WhatsApp notification sent automatically to ${profileData.whatsAppNumber}`
          }])
          
          // Continue with upload after sending notification
          return { success: true, highTemp: true }
        }

        // Continue with normal upload if no high temperature
        return { success: true, highTemp: false }
      }

      // Simulate progress
      for (let i = 0; i <= 100; i += 10) {
        setCollectionProgress(i)
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      const result = await simulateFileUpload()
      
      setMessages(prev => [...prev, {
        type: 'success',
        text: `Patient data uploaded successfully for ID: ${patientId}`
      }])

    } catch (error) {
      setMessages(prev => [...prev, {
        type: 'error',
        text: 'Failed to collect patient data'
      }])
      addMessage('error', `Data collection failed: ${error.response?.data?.error || error.message}`)
    } finally {
      setIsCollecting(false)
      setTimeout(() => setCollectionProgress(0), 1000)
    }
  }

  const proceedWithUpload = async () => {
    if (!highTempFile) return

    try {
      // Send WhatsApp notification
      await sendWhatsAppNotification(
        profileData.whatsAppNumber,
        highTempFile.temperature,
        highTempFile.file.name
      )

      // Continue with the upload
      setMessages(prev => [...prev, {
        type: 'success',
        text: `Patient data uploaded successfully for ID: ${patientId}`
      }])

      // Reset modal state
      setShowWhatsAppModal(false)
      setHighTempFile(null)
      setWhatsAppNumber('')

    } catch (error) {
      setMessages(prev => [...prev, {
        type: 'error',
        text: 'Failed to complete upload'
      }])
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
                  <div className="whatsapp-input-section">
                    <label className="whatsapp-label">WhatsApp Number</label>
                    <div className="whatsapp-input-group">
                      <input
                        type="text"
                        value={profileData.whatsAppNumber}
                        onChange={(e) => setProfileData(prev => ({ ...prev, whatsAppNumber: e.target.value }))}
                        placeholder="+1234567890"
                        className="whatsapp-input"
                      />
                      <button 
                        className="save-whatsapp-btn"
                        onClick={() => {
                          // Update the profileWhatsAppNumbers array for current account
                          const currentAccountIndex = ganacheAccounts.indexOf(profileData.address)
                          if (currentAccountIndex !== -1) {
                            profileWhatsAppNumbers[currentAccountIndex] = profileData.whatsAppNumber
                            setMessages(prev => [...prev, {
                              type: 'success',
                              text: `WhatsApp number updated for ${profileData.name}`
                            }])
                          }
                        }}
                      >
                        Save
                      </button>
                    </div>
                  </div>
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
                            <div className="account-whatsapp">{profileWhatsAppNumbers[index]}</div>
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
              {messages.length === 0 ? (
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

      {/* WhatsApp Notification Modal */}
      {showWhatsAppModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>🚨 High Temperature Alert</h3>
              <button 
                className="modal-close"
                onClick={() => setShowWhatsAppModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="alert-message">
                <AlertCircle size={24} className="alert-icon" />
                <div>
                  <p><strong>High temperature detected:</strong> {highTempFile?.temperature}°F</p>
                  <p><strong>File:</strong> {highTempFile?.file.name}</p>
                  <p><strong>Patient ID:</strong> {patientId}</p>
                </div>
              </div>
              
              <div className="whatsapp-info">
                <p><strong>WhatsApp notification will be sent to:</strong></p>
                <div className="contact-info">
                  <span className="contact-name">{profileData.name}</span>
                  <span className="contact-number">{profileData.whatsAppNumber}</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="secondary-btn"
                onClick={() => setShowWhatsAppModal(false)}
              >
                Cancel
              </button>
              <button 
                className="primary-btn"
                onClick={proceedWithUpload}
              >
                Send WhatsApp & Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
