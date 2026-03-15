// This endpoint triggers the main bot via fetch
module.exports = async (req, res) => {
    // Get the base URL from the request
    const baseUrl = `https://${req.headers.host}`;
    
    try {
        // Trigger the main bot
        const response = await fetch(`${baseUrl}/api/bot`);
        const result = await response.json();
        
        res.status(200).json({
            success: true,
            triggered: new Date().toISOString(),
            botResult: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
