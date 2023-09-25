const filePayLoadExists = (req, res, next) => {
    if (!req.files) return res.status(400).json({ message: 'Missing File' });
    next();
}

export { filePayLoadExists }