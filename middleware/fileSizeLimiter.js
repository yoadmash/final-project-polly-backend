const MB = 1;
const FILE_SIZE_LIMIT = MB * 1024 * 1024;

const fileSizeLimiter = (req, res, next) => {
    const file = Object.values(req.files)[0];
    if (file.size > FILE_SIZE_LIMIT) {
        return res.status(413).json({message: 'File too big, must be 1MB or lower'});
    }
    
    next();
}

export { fileSizeLimiter }