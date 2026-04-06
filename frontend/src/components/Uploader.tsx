import { useRef, useState } from 'react'
import axios from 'axios'
import { FiUpload, FiRefreshCw } from 'react-icons/fi'

type Props = {
  onUploadSuccess: () => void
}

export default function Uploader({ onUploadSuccess }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const handleScanClick = async () => {
    setIsScanning(true)
    try {
      const res = await axios.post('/scan')
      alert(`Successfully scanned. Inserted ${res.data.inserted} new records.`)
      onUploadSuccess()
    } catch (err) {
      alert('Error scanning local sheets directory.')
      console.error(err)
    } finally {
      setIsScanning(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      setIsUploading(true)
      
      const formData = new FormData()
      formData.append('file', file)

      try {
        const res = await axios.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        alert(`Successfully uploaded. Inserted ${res.data.inserted} new records.`)
        onUploadSuccess()
      } catch (err) {
        alert('Error uploading file.')
        console.error(err)
      } finally {
        setIsUploading(false)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    }
  }

  return (
    <div className="actions">
      <button 
        className="btn" 
        onClick={handleScanClick}
        disabled={isScanning}
      >
        <FiRefreshCw className={isScanning ? "spinner" : ""} style={isScanning ? {width: '14px', height: '14px', margin: 0, borderWidth: '2px'} : {}} />
        {isScanning ? 'Scanning...' : 'Scan /sheets'}
      </button>
      
      <button 
        className="btn btn-primary" 
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
      >
        <FiUpload />
        {isUploading ? 'Uploading...' : 'Upload CSV'}
      </button>
      
      <input 
        type="file" 
        accept=".csv" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden-input" 
      />
    </div>
  )
}
