import crypto from "crypto";

export const assetBytesToPublicKey = (assetBytes: string): string => {
    const hash = crypto.createHash('sha256')
        .update(Buffer.from(assetBytes, 'utf8'))
        .digest();
    return hash.toString("hex");
};
