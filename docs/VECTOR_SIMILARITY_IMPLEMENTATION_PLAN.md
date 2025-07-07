# Vector-Based Error Similarity Implementation Plan

## Overview

This document outlines the implementation plan for adding vector-based error similarity search using MiniLM and transformers to enhance the existing error analysis system. This approach will provide semantic understanding of error messages beyond traditional string similarity algorithms.

## Current State

The existing error analysis system (`src/lib/error-analyzer.ts`) uses:

- Levenshtein distance and Jaro-Winkler similarity for error messages
- Jaccard similarity for call logs and stack traces
- Weighted formula: `errorSimilarity * 0.4 + callLogSimilarity * 0.3 + stackSimilarity * 0.3`
- Fixed threshold of 0.7 for automatic assumption creation

## Implementation Plan

### Phase 1: Setup and Dependencies ✅ COMPLETED

- [x] **Add Required Dependencies**

  - [x] `@xenova/transformers` - For running Transformers models in Node.js
  - [x] `@tensorflow/tfjs-node` - Backend for TensorFlow.js operations
  - [ ] Optional: `faiss-node` - For efficient vector similarity search (if scaling becomes an issue)

- [x] **Model Selection**
  - [x] Use `Xenova/all-MiniLM-L6-v2` model (verified working)
  - [x] Small, fast, and good for semantic similarity (~80MB model size)
  - [x] Verify compatibility with Node.js environment

**Phase 1 Results:**

- Dependencies installed successfully
- Model loads correctly using `Xenova/all-MiniLM-L6-v2` identifier
- Generates 384-dimensional embeddings as expected
- Semantic similarity working (test showed 0.8903 similarity between similar error messages)
- Compatible with Node.js environment

### Phase 2: Create Vector Service

- [x] **New Service File**: `src/services/vectorSimilarityService.ts` ✅ COMPLETED

  - [x] Initialize and load the MiniLM model
  - [x] Generate embeddings for error messages and stack traces
  - [x] Calculate cosine similarity between vectors
  - [x] Cache model in memory for performance

**Phase 2.1 Results:**

- Complete vector similarity service implemented
- Model lazy loading with singleton pattern
- Embedding cache with configurable size (default: 1000)
- Batch processing capability for multiple texts
- Text normalization and error handling
- Comprehensive logging and monitoring
- All functionality verified with test results:

  - Model loads correctly (384-dimensional embeddings)
  - Cache working (hit rate tracking)
  - High similarity for similar errors (0.8903)
  - Lower similarity for different errors (0.4963)
  - Confidence scoring implemented

- [ ] **Database Schema Extension**
  - [ ] Add vector storage fields to `ResultError` table
  - [ ] Store embeddings as JSON or binary data
  - [ ] Add indexes for efficient retrieval

### Phase 3: Enhance Error Analyzer

- [ ] **New Function**: `calculateVectorSimilarity()`

  - [ ] Generate embeddings for error messages
  - [ ] Compare using cosine similarity
  - [ ] Return similarity score (0-1)

- [ ] **Hybrid Approach**
  - [ ] Keep existing string-based similarity as fallback
  - [ ] Add vector similarity to the scoring formula
  - [ ] New formula: `vectorSimilarity * 0.5 + errorSimilarity * 0.2 + callLogSimilarity * 0.15 + stackSimilarity * 0.15`

### Phase 4: Implementation Steps

#### Step 1: Add Dependencies

- [ ] Install `@xenova/transformers @tensorflow/tfjs-node`
- [ ] Update package.json and verify installation
- [ ] Test basic model loading capability

#### Step 2: Create Vector Service

- [ ] Create `src/services/vectorSimilarityService.ts` with:
  - [ ] Model initialization
  - [ ] Text embedding generation
  - [ ] Vector similarity calculation
  - [ ] Caching mechanism

#### Step 3: Database Migration

- [ ] Add vector fields to ResultError table:
  ```sql
  ALTER TABLE "ResultError"
  ADD COLUMN message_embedding TEXT,
  ADD COLUMN stack_embedding TEXT,
  ADD COLUMN vector_similarity_score FLOAT;
  ```

#### Step 4: Enhance Error Analyzer

- [ ] Add new `calculateVectorSimilarity()` function
- [ ] Integrate with existing `runReview()` workflow
- [ ] Update scoring formula to include vector similarity

#### Step 5: Testing

- [ ] Create unit tests for vector similarity calculation
- [ ] Compare results with existing string-based approach
- [ ] Performance benchmarking

### Phase 5: Optimization and Scaling

- [ ] **Performance Optimizations**

  - [ ] Implement embedding caching
  - [ ] Batch processing for multiple errors
  - [ ] Lazy loading of the model

- [ ] **Memory Management**
  - [ ] Model lifecycle management
  - [ ] Memory usage monitoring
  - [ ] Graceful fallback if model fails to load

## Expected Performance Impact

- **Model Loading**: ~2-5 seconds on startup
- **Embedding Generation**: ~20-100ms per error message
- **Similarity Calculation**: ~1-5ms per comparison
- **Memory Usage**: ~200-500MB for model + embeddings cache
- **Total Processing Time**: +100-200ms per error analysis

## Benefits of This Approach

1. **Privacy**: All processing stays local, no external API calls
2. **Cost**: No per-request charges after initial setup
3. **Speed**: Fast inference once model is loaded (~10-50ms per embedding)
4. **Accuracy**: Better semantic understanding vs. string similarity
5. **Hybrid Safety**: Falls back to existing methods if vector processing fails

## Technical Specifications

### Model Details

- **Model**: `sentence-transformers/all-MiniLM-L6-v2`
- **Size**: ~80MB
- **Output Dimensions**: 384-dimensional vectors
- **Performance**: ~20-100ms per embedding on modern hardware

### Database Schema Changes

```sql
-- Add AI analysis fields to ResultError table
ALTER TABLE "ResultError"
ADD COLUMN message_embedding TEXT,
ADD COLUMN stack_embedding TEXT,
ADD COLUMN vector_similarity_score FLOAT;

-- Add index for vector similarity searches
CREATE INDEX idx_vector_similarity_score ON "ResultError"(vector_similarity_score);
```

### Environment Variables

```bash
# Vector similarity configuration
VECTOR_SIMILARITY_ENABLED=true
VECTOR_MODEL_PATH=./models/minilm
VECTOR_SIMILARITY_THRESHOLD=0.8
VECTOR_CACHE_SIZE=1000
```

## Implementation Notes

### Error Message Processing

- Combine error message, type, and key stack trace elements
- Normalize text before embedding generation
- Handle edge cases (empty messages, very long texts)

### Similarity Calculation

- Use cosine similarity for vector comparison
- Implement efficient batch processing for multiple comparisons
- Cache frequently used embeddings

### Integration Strategy

- Gradual rollout with feature flags
- A/B testing against existing algorithm
- Performance monitoring and alerting

## Success Metrics

- [ ] **Accuracy Improvement**: Increase in correctly matched similar errors
- [ ] **False Positive Reduction**: Decrease in incorrect assumption linkages
- [ ] **Performance**: Maintain acceptable response times (<2 seconds)
- [ ] **Resource Usage**: Memory usage within acceptable limits (<1GB)
- [ ] **Reliability**: System stability with graceful fallbacks

## Next Steps

1. **Phase 1 Implementation**: Start with dependency installation and model verification
2. **Proof of Concept**: Build minimal vector service for testing
3. **Integration**: Add to existing error analyzer with hybrid approach
4. **Testing**: Comprehensive testing and performance evaluation
5. **Deployment**: Gradual rollout with monitoring

---

**Document Version**: 1.0  
**Created**: January 2025  
**Status**: Planning Phase
