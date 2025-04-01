import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentsAPI } from '../../services/api';

const DocumentUpload = () => {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  
  const navigate = useNavigate();
  
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    validateAndSetFile(selectedFile);
  };
  
  const validateAndSetFile = (selectedFile) => {
    setError('');
    
    if (!selectedFile) {
      return;
    }
    
    // Check file type
    if (selectedFile.type !== 'application/pdf') {
      setError('Only PDF files are allowed');
      return;
    }
    
    // Check file size (10MB limit)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB limit');
      return;
    }
    
    setFile(selectedFile);
    
    // Auto-set title from filename if not already set
    if (!title) {
      // Remove extension and replace hyphens/underscores with spaces
      const filename = selectedFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setTitle(filename);
    }
  };
  
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a file to upload');
      return;
    }
    
    if (!title.trim()) {
      setError('Please enter a title for the document');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const formData = new FormData();
      formData.append('document', file);
      formData.append('title', title);
      
      await documentsAPI.uploadDocument(formData);
      
      // Redirect to documents list
      navigate('/documents');
    } catch (error) {
      console.error('Upload error:', error);
      setError(error.response?.data?.message || 'Failed to upload document');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Upload Document</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="title" className="block text-gray-700 text-sm font-bold mb-2">
              Document Title
            </label>
            <input
              type="text"
              id="title"
              className="input"
              placeholder="Enter document title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Upload PDF Document
            </label>
            <div 
              className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center h-60 cursor-pointer ${
                dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => document.getElementById('fileInput').click()}
            >
              <svg 
                className={`w-16 h-16 mb-4 ${file ? 'text-green-500' : 'text-gray-400'}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                />
              </svg>
              
              <p className="text-gray-700 text-center mb-2">
                {file ? file.name : 'Drag & drop your PDF here or click to browse'}
              </p>
              <p className="text-gray-500 text-sm text-center">
                {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'PDF files only, max 10MB'}
              </p>
              
              <input
                type="file"
                id="fileInput"
                className="hidden"
                accept="application/pdf"
                onChange={handleFileChange}
              />
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              type="button"
              className="btn btn-secondary mr-2"
              onClick={() => navigate('/documents')}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DocumentUpload; 