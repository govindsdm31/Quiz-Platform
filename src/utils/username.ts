/**
 * Username and password generation utilities
 */

/**
 * Generate a random string of specified length using given character set
 * @param length - Length of the string to generate
 * @param chars - Character set to use
 * @returns Random string
 */
export function generateRandomString(length: number, chars: string): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/**
 * Generate a random username
 * @param length - Length of the username
 * @param chars - Character set to use
 * @param existingUsernames - Array of existing usernames to avoid collisions
 * @returns Unique username
 */
export function generateUniqueUsername(
  length: number,
  chars: string,
  existingUsernames: string[]
): string {
  const tryGenerate = () => generateRandomString(length, chars);

  let attempts = 0;
  let username = tryGenerate();

  // Try up to 10 times to generate a unique username
  while (existingUsernames.includes(username) && attempts < 10) {
    username = tryGenerate();
    attempts++;
  }

  // If still not unique, append timestamp to ensure uniqueness
  if (existingUsernames.includes(username)) {
    username = (username + Date.now().toString().slice(-3)).slice(0, length + 3);
  }

  return username;
}

/**
 * Generate a random password for students
 * @returns Random password
 */
export function generatePassword(): string {
  return `pass${Math.floor(Math.random() * 10000)}`;
}
