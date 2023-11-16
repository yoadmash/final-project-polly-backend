import path from 'path';

const fileExtLimiter = (allowedExtList) => {
    return (req, res, next) => {
        if (req.files) {
            const file = Object.values(req.files)[0];
            const fileExt = path.extname(file.name);

            const allowed = allowedExtList.includes(fileExt);

            if (!allowed) {
                return res.status(422).json({ message: `File type mismatch. Supported types: ${allowedExtList.join(', ')}` });
            }
        }
        next();
    }
}

export { fileExtLimiter }