const MB = 5;
const FILE_SIZE_LIMIT = MB * 1024 * 1024;

const fileSizeLimiter = (req, res, next) => {
    if (req.files) {
        const file = Object.values(req.files)[0];
        if (file.size > FILE_SIZE_LIMIT) {
            return res.status(413).json({ message: `File too big, must be ${MB}MB or lower` });
        }
    }
    next();
}

export { fileSizeLimiter }