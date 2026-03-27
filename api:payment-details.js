const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  try {
    const dataFile = path.join(process.cwd(), 'data.json');
    
    if (fs.existsSync(dataFile)) {
      const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
      const paymentDetails = data.admin_settings?.payment_details || 'Not set';
      
      res.status(200).json({ 
        success: true, 
        payment_details: paymentDetails 
      });
    } else {
      res.status(404).json({ 
        success: false, 
        error: 'Data file not found' 
      });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};