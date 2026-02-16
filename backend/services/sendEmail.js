const Brevo = require('@getbrevo/brevo');
const crypto = require('crypto');
const redisClient = require('../database/redisconnection');

async function sendEmail(userData) {
    try {
        const secret = crypto.randomBytes(3).toString('hex');
        console.log('Generated OTP:', secret);

        const apiInstance = new Brevo.TransactionalEmailsApi();
        apiInstance.setApiKey(
            Brevo.TransactionalEmailsApiApiKeys.apiKey,
            process.env.BREVO_API_KEY
        );

        const sendSmtpEmail = {
            to: [{ email: userData.email }],
            sender: { email: "jagdishgithub1@gmail.com", name: "NexInterview" },
            subject: "NexInterview | OTP Verification",
            htmlContent: `
        <div style="background-color:#000000;padding:40px 0;font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <div style="max-width:520px;margin:0 auto;background:#000000;border-radius:12px;
            border:1px solid #1f1f1f;
            box-shadow:0 10px 30px rgba(0,0,0,0.5);
            padding:40px;color:#ffffff;">

            <!-- HEADER -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                <td align="center">
                    <div style="
                    width:40px;height:40px;
                    background:#ffffff;
                    border-radius:6px;
                    display:inline-block;
                    text-align:center;
                    line-height:40px;
                    font-weight:bold;
                    font-size:22px;
                    color:#000000;">
                    N
                    </div>
                    <div style="
                    margin-top:12px;
                    font-size:20px;
                    font-weight:700;
                    letter-spacing:-0.5px;
                    color:#ffffff;">
                    NexInterview
                    </div>
                </td>
                </tr>
            </table>

            <!-- BODY -->
            <h2 style="margin-bottom:12px;color:#ffffff;text-align:center;font-size:24px;font-weight:700;">
                Verify your email
            </h2>

            <p style="color:#a3a3a3;font-size:15px;line-height:1.6;text-align:center;margin-bottom:32px;">
                To finish setting up your NexInterview account, please use the following verification code. 
                This code will expire in <span style="color:#ffffff;font-weight:600;">5 minutes</span>.
            </p>

            <!-- OTP -->
            <div style="
                margin:32px 0;
                padding:24px;
                text-align:center;
                font-size:36px;
                letter-spacing:10px;
                font-weight:800;
                color:#ffffff;
                background:#0a0a0a;
                border:1px solid #1f1f1f;
                border-radius:12px;
                font-family: 'JetBrains Mono', 'Fira Code', monospace;">
                ${secret}
            </div>

            <p style="font-size:13px;color:#525252;text-align:center;">
                If you didn't request this code, you can safely ignore this email.
            </p>

            <!-- FOOTER -->
            <div style="margin-top:40px;padding-top:24px;border-top:1px solid #1f1f1f;
                font-size:12px;color:#525252;text-align:center;">
                &copy; ${new Date().getFullYear()} NexInterview. All rights reserved.
            </div>

            </div>
        </div>
        `,
        };


        await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log('Email sent successfully to', userData.email);

        const { email, password } = userData;
        await redisClient.set(`otp:${email}`, secret, { EX: 300 });
        await redisClient.set(
            `user:${email}`,
            JSON.stringify(userData),
            { EX: 300 }
        );
        return true;
    }
    catch (err) {
        console.error('Error sending email:', err.response?.body || err.message);
        return false;
    }
}

module.exports = sendEmail;