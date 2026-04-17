import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>("email.resendApiKey");
    this.fromEmail =
      this.configService.get<string>("email.from") ??
      "FinnWeb <no-reply@finnweb.app>";

    this.resend = apiKey ? new Resend(apiKey) : null;
  }

  private ensureConfigured() {
    if (!this.resend) {
      this.logger.warn(
        "Email provider is not configured. Set RESEND_API_KEY to enable outbound emails.",
      );
      return false;
    }

    return true;
  }

  async sendVerificationEmail(input: {
    to: string;
    verifyUrl: string;
    userName?: string | null;
  }) {
    if (!this.ensureConfigured()) {
      return;
    }

    const displayName = input.userName?.trim() || "there";

    const { error } = await this.resend!.emails.send({
      from: this.fromEmail,
      to: [input.to],
      subject: "Verify your FinnWeb email",
      html: `
        <p>Hi ${displayName},</p>
        <p>Thanks for joining FinnWeb. Please verify your email address:</p>
        <p><a href="${input.verifyUrl}">Verify email</a></p>
        <p>If the button does not work, use this link:</p>
        <p>${input.verifyUrl}</p>
      `,
      text: `Hi ${displayName},\n\nVerify your email: ${input.verifyUrl}`,
    });

    if (error) {
      this.logger.error(`Resend verification email failed: ${error.message}`);
      throw new Error("EMAIL_SEND_FAILED");
    }
  }

  async sendPasswordResetEmail(input: {
    to: string;
    resetUrl: string;
    userName?: string | null;
  }) {
    if (!this.ensureConfigured()) {
      return;
    }

    const displayName = input.userName?.trim() || "there";

    const { error } = await this.resend!.emails.send({
      from: this.fromEmail,
      to: [input.to],
      subject: "Reset your FinnWeb password",
      html: `
        <p>Hi ${displayName},</p>
        <p>We received a request to reset your FinnWeb password.</p>
        <p><a href="${input.resetUrl}">Reset password</a></p>
        <p>If you did not request this, you can safely ignore this email.</p>
        <p>${input.resetUrl}</p>
      `,
      text: `Hi ${displayName},\n\nReset your password: ${input.resetUrl}`,
    });

    if (error) {
      this.logger.error(`Resend reset email failed: ${error.message}`);
      throw new Error("EMAIL_SEND_FAILED");
    }
  }
}
