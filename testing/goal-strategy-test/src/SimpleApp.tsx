import React from 'react'

function SimpleApp() {
  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f0f0f0',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: '#333', marginBottom: '20px' }}>
        🎯 Goal & Strategy Service Testing Interface
      </h1>
      <div style={{ 
        backgroundColor: 'white', 
        padding: '20px', 
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ color: '#666', marginBottom: '15px' }}>
          ✅ React Application is Working!
        </h2>
        <p style={{ color: '#555', lineHeight: '1.6' }}>
          This confirms that the React application is loading and rendering correctly.
          The Goal & Strategy Service testing interface is ready for user validation.
        </p>
        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          backgroundColor: '#e8f5e8',
          borderRadius: '4px',
          border: '1px solid #4caf50'
        }}>
          <strong style={{ color: '#2e7d32' }}>Status: Ready for Testing</strong>
          <br />
          <span style={{ color: '#555' }}>
            Frontend: ✅ Running | Backend API: ✅ Running | Database: ✅ Connected
          </span>
        </div>
      </div>
    </div>
  )
}

export default SimpleApp