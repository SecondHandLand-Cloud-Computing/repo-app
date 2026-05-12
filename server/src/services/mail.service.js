import handlebars from "handlebars";
import fs from "fs";
import path from "path";

import { env } from "../config/env.js";
import { transporter } from "../config/mail.config.js";
import { logger } from "../utils/logger.js";

const cache = new Map();

export const MailService = {
  loadTemplate(fileName, data) {
    if (cache.has(fileName)) {
      return cache.get(fileName)(data);
    }

    const filePath = path.join(process.cwd(), "src", "templates", fileName);
    const source = fs.readFileSync(filePath, "utf8");
    const compiled = handlebars.compile(source);

    cache.set(fileName, compiled);

    return compiled(data);
  },

  async sendTemplate(to, subject, templateName, data, retries = 0) {
    const html = this.loadTemplate(templateName, data);
    try {
      const info = await transporter.sendMail({
        from: `"Second Hand Land" <${env.EMAIL_USER}>`,
        to,
        subject,
        html,
      });

      logger.info(`[MAIL] Sent to ${to} (id: ${info.messageId})`);
      return info;
    } catch (err) {
      logger.error(`[MAIL] Failed to send email to ${to}: ${err.message}`);

      if (retries > 0) {
        logger.warn(`[MAIL] Retrying... attempts left: ${retries}`);
        return this.sendTemplate(to, subject, templateName, data, retries - 1);
      }

      throw err;
    }
  },

  sendOtp(email, otp) {
    return this.sendTemplate(email, "Your Verification Code", "verifyOtp.hbs", { otp });
  },

  sendRegisterSuccess(email) {
    return this.sendTemplate(email, "Welcome to Second Hand Land", "registerSuccess.hbs", {});
  },
};
