export interface ImageGenerationService {
  generate(prompt: string, roomId: string): Promise<string[]>;
}
