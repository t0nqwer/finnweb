export function maskLineOaToken(value?: string | null) {
  const token = value?.trim();

  if (!token) {
    return "<empty>";
  }

  if (token.length <= 8) {
    return "****";
  }

  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

export function textContainsSecret(text: string, secret?: string | null) {
  const normalizedSecret = secret?.trim();
  return !!normalizedSecret && text.includes(normalizedSecret);
}
