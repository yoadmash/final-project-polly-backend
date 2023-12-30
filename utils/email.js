import nodemailer from 'nodemailer';

const config = {
    service: "gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: 'yoad.studies@gmail.com',
        pass: 'xlnhtsyjmyinuene'
    }
}

const sendEmail = (data) => {
    const emailService = nodemailer.createTransport(config);
    emailService.sendMail(data, (err, info) => {
        if (err) {
            console.log(err);
        } else {
            return info.response;
        }
    })
}

export { sendEmail };