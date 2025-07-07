import { pipeline, FeatureExtractionPipeline } from "@xenova/transformers";

import getLogger from "@/lib/logger";

const logger = getLogger("vector-similarity");

export interface VectorEmbedding {
  text: string;
  embedding: number[];
  timestamp: Date;
}

export interface SimilarityResult {
  similarity: number;
  confidence: number;
}

export interface VectorSimilarityConfig {
  modelName: string;
  cacheSize: number;
  similarityThreshold: number;
}

class VectorSimilarityService {
  private model: FeatureExtractionPipeline | null = null;
  private isInitializing = false;
  private embeddingCache = new Map<string, VectorEmbedding>();
  private readonly config: VectorSimilarityConfig;

  constructor(config?: Partial<VectorSimilarityConfig>) {
    this.config = {
      modelName: "Xenova/all-MiniLM-L6-v2",
      cacheSize: 1000,
      similarityThreshold: 0.8,
      ...config,
    };

    logger.info(
      "VectorSimilarityService initialized with config:",
      this.config,
    );
  }

  private async initializeModel(): Promise<void> {
    if (this.model || this.isInitializing) {
      return;
    }

    this.isInitializing = true;
    logger.info(`Loading vector similarity model: ${this.config.modelName}`);

    try {
      this.model = await pipeline("feature-extraction", this.config.modelName);
      logger.info("Vector similarity model loaded successfully");
    } catch (error) {
      logger.error("Failed to load vector similarity model:", error);
      throw new Error(`Failed to initialize vector similarity model: ${error}`);
    } finally {
      this.isInitializing = false;
    }
  }

  private async ensureModelReady(): Promise<FeatureExtractionPipeline> {
    if (!this.model) {
      await this.initializeModel();
    }

    if (!this.model) {
      throw new Error("Vector similarity model failed to initialize");
    }

    return this.model;
  }

  /**
   * Generate embeddings for error messages and stack traces
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const cacheKey = this.createCacheKey(text);

      // Check cache first
      const cached = this.embeddingCache.get(cacheKey);
      if (cached) {
        logger.debug(`Cache hit for text: ${text.substring(0, 50)}...`);
        return cached.embedding;
      }

      const model = await this.ensureModelReady();

      const normalizedText = this.normalizeText(text);

      const embedding = await model(normalizedText, {
        pooling: "mean",
        normalize: true,
      });

      const embeddingArray = Array.from(embedding.data) as number[];

      this.cacheEmbedding(cacheKey, text, embeddingArray);

      logger.debug(
        `Generated embedding for text: ${text.substring(0, 50)}... (${embeddingArray.length} dimensions)`,
      );

      return embeddingArray;
    } catch (error) {
      logger.error("Error generating embedding:", error);
      throw new Error(`Failed to generate embedding: ${error}`);
    }
  }

  calculateCosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) {
      throw new Error("Vectors must have the same dimensions");
    }

    const dotProduct = vectorA.reduce(
      (sum, a, i) => sum + a * (vectorB[i] ?? 0),
      0,
    );
    const magnitudeA = Math.sqrt(vectorA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vectorB.reduce((sum, b) => sum + b * b, 0));

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  async calculateTextSimilarity(
    textA: string,
    textB: string,
  ): Promise<SimilarityResult> {
    try {
      const [embeddingA, embeddingB] = await Promise.all([
        this.generateEmbedding(textA),
        this.generateEmbedding(textB),
      ]);

      const similarity = this.calculateCosineSimilarity(embeddingA, embeddingB);
      const confidence = this.calculateConfidence(similarity);

      logger.debug(
        `Similarity calculated: ${similarity.toFixed(4)} (confidence: ${confidence.toFixed(4)})`,
      );

      return {
        similarity,
        confidence,
      };
    } catch (error) {
      logger.error("Error calculating text similarity:", error);
      throw new Error(`Failed to calculate text similarity: ${error}`);
    }
  }

  async generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    try {
      const embeddings = await Promise.all(
        texts.map((text) => this.generateEmbedding(text)),
      );

      logger.debug(`Generated ${embeddings.length} embeddings in batch`);
      return embeddings;
    } catch (error) {
      logger.error("Error generating embeddings batch:", error);
      throw new Error(`Failed to generate embeddings batch: ${error}`);
    }
  }

  private normalizeText(text: string): string {
    if (!text || typeof text !== "string") {
      return "";
    }

    return text
      .trim()
      .replace(/\s+/g, " ") // Replace multiple whitespace with single space
      .substring(0, 512); // Limit length to avoid model constraints
  }

  private createCacheKey(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `embedding_${hash.toString(36)}`;
  }

  private cacheEmbedding(key: string, text: string, embedding: number[]): void {
    if (this.embeddingCache.size >= this.config.cacheSize) {
      const firstKey = this.embeddingCache.keys().next().value;
      if (firstKey) {
        this.embeddingCache.delete(firstKey);
      }
    }

    this.embeddingCache.set(key, {
      text,
      embedding,
      timestamp: new Date(),
    });
  }

  private calculateConfidence(similarity: number): number {
    if (similarity >= 0.8) {
      return 0.9 + (similarity - 0.8) * 0.5;
    } else if (similarity >= 0.5) {
      return 0.5 + (similarity - 0.5) * (0.4 / 0.3);
    } else {
      return similarity;
    }
  }

  getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate?: number;
  } {
    return {
      size: this.embeddingCache.size,
      maxSize: this.config.cacheSize,
    };
  }

  clearCache(): void {
    this.embeddingCache.clear();
    logger.info("Embedding cache cleared");
  }

  isReady(): boolean {
    return this.model !== null;
  }

  getModelInfo(): {
    modelName: string;
    isLoaded: boolean;
    dimensions: number;
  } {
    return {
      modelName: this.config.modelName,
      isLoaded: this.model !== null,
      dimensions: 384,
    };
  }
}

export const vectorSimilarityService = new VectorSimilarityService();

export { VectorSimilarityService };
