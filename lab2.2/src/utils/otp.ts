import { ResultAsync } from "neverthrow";
import QRCode from "qrcode";

/**
 * Generates a 8 digit OTP
 */
export function generateOTP() {
	return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generateQRCode(username: string, secret: string) {
	const uri = `otpauth://totp/MessengerLab:${username}?secret=${secret}&issuer=MessengerLab`;

	return ResultAsync.fromPromise(
		QRCode.toBuffer(uri, { type: "png" }),
		(e) => new Error(`QR_GEN_ERROR: ${(e as Error).message}`),
	);
}
