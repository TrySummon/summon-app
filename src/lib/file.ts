import * as fs from "fs/promises";
import path from "path";

/**
 * Creates a directory if it doesn't exist
 *
 * @param dir Directory path to create
 */
export async function ensureDirectoryExists(dir: string): Promise<void> {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
      throw error;
    }
  }
}

/**
 * Writes content to a file, creating parent directories if needed
 *
 * @param filePath Path where the file should be written
 * @param content Content to write to the file
 */
export async function writeFileWithDir(
  filePath: string,
  content: string,
): Promise<void> {
  const dir = path.dirname(filePath);
  await ensureDirectoryExists(dir);
  await fs.writeFile(filePath, content, "utf8");
}
