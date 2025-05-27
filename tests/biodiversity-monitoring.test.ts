import { describe, it, expect, beforeEach } from 'vitest'

// Mock Biodiversity Monitoring Contract
const mockBiodiversityContract = {
  state: new Map(),
  observations: new Map(),
  counters: new Map([['survey-counter', 0], ['observation-counter', 0]]),
  
  // Species categories
  CATEGORY_BIRDS: 1,
  CATEGORY_INSECTS: 2,
  CATEGORY_PLANTS: 3,
  CATEGORY_MAMMALS: 4,
  CATEGORY_AQUATIC: 5,
  
  conductSurvey(location, totalSpecies, nativeSpecies, endangeredSpecies, invasiveSpecies, habitatQuality) {
    // Validate data consistency
    if (totalSpecies < (nativeSpecies + endangeredSpecies + invasiveSpecies)) {
      return { error: 'ERR_INVALID_DATA' }
    }
    if (habitatQuality < 0 || habitatQuality > 100) {
      return { error: 'ERR_INVALID_DATA' }
    }
    
    const surveyId = this.counters.get('survey-counter') + 1
    this.counters.set('survey-counter', surveyId)
    
    this.state.set(`survey-${surveyId}`, {
      location,
      surveyor: 'test-principal',
      totalSpecies,
      nativeSpecies,
      endangeredSpecies,
      invasiveSpecies,
      habitatQuality,
      surveyDate: Date.now(),
      verified: false
    })
    
    return { success: surveyId }
  },
  
  addSpeciesObservation(surveyId, speciesName, category, populationCount, healthStatus, native) {
    const survey = this.state.get(`survey-${surveyId}`)
    if (!survey) return { error: 'ERR_SURVEY_NOT_FOUND' }
    
    if (category < 1 || category > 5) return { error: 'ERR_INVALID_DATA' }
    if (healthStatus < 0 || healthStatus > 100) return { error: 'ERR_INVALID_DATA' }
    
    const observationId = this.counters.get('observation-counter') + 1
    this.counters.set('observation-counter', observationId)
    
    this.observations.set(`observation-${observationId}`, {
      surveyId,
      speciesName,
      category,
      populationCount,
      healthStatus,
      native
    })
    
    return { success: observationId }
  },
  
  verifySurvey(surveyId, verifier = 'contract-owner') {
    const survey = this.state.get(`survey-${surveyId}`)
    if (!survey) return { error: 'ERR_SURVEY_NOT_FOUND' }
    
    survey.verified = true
    this.state.set(`survey-${surveyId}`, survey)
    
    return { success: true }
  },
  
  getSurvey(surveyId) {
    return this.state.get(`survey-${surveyId}`) || null
  },
  
  getObservation(observationId) {
    return this.observations.get(`observation-${observationId}`) || null
  },
  
  calculateBiodiversityIndex(surveyId) {
    const survey = this.state.get(`survey-${surveyId}`)
    if (!survey) return { error: 'ERR_SURVEY_NOT_FOUND' }
    
    const nativeRatio = Math.floor((survey.nativeSpecies * 100) / survey.totalSpecies)
    const habitatScore = survey.habitatQuality
    const threatPenalty = survey.invasiveSpecies
    
    const index = Math.floor((nativeRatio + habitatScore + (100 - threatPenalty)) / 3)
    
    return { success: index }
  },
  
  getSurveyCount() {
    return this.counters.get('survey-counter')
  },
  
  getObservationCount() {
    return this.counters.get('observation-counter')
  }
}

describe('Biodiversity Monitoring Contract', () => {
  beforeEach(() => {
    mockBiodiversityContract.state.clear()
    mockBiodiversityContract.observations.clear()
    mockBiodiversityContract.counters.set('survey-counter', 0)
    mockBiodiversityContract.counters.set('observation-counter', 0)
  })
  
  describe('conduct-survey', () => {
    it('should successfully conduct biodiversity survey', () => {
      const result = mockBiodiversityContract.conductSurvey(
          'Urban Forest Reserve',
          50, // total-species
          35, // native-species
          5,  // endangered-species
          10, // invasive-species
          85  // habitat-quality
      )
      
      expect(result.success).toBe(1)
      expect(mockBiodiversityContract.getSurveyCount()).toBe(1)
      
      const survey = mockBiodiversityContract.getSurvey(1)
      expect(survey.location).toBe('Urban Forest Reserve')
      expect(survey.totalSpecies).toBe(50)
      expect(survey.nativeSpecies).toBe(35)
      expect(survey.verified).toBe(false)
    })
    
    it('should reject survey with inconsistent species data', () => {
      const result = mockBiodiversityContract.conductSurvey(
          'Test Location',
          30, // total-species
          25, // native-species
          10, // endangered-species
          15, // invasive-species (25 + 10 + 15 = 50 > 30 total)
          80
      )
      
      expect(result.error).toBe('ERR_INVALID_DATA')
      expect(mockBiodiversityContract.getSurveyCount()).toBe(0)
    })
    
    it('should reject survey with invalid habitat quality', () => {
      const result = mockBiodiversityContract.conductSurvey(
          'Test Location',
          50, 35, 5, 10,
          150 // invalid habitat quality > 100
      )
      
      expect(result.error).toBe('ERR_INVALID_DATA')
    })
    
    it('should handle edge case with zero invasive species', () => {
      const result = mockBiodiversityContract.conductSurvey(
          'Pristine Reserve',
          40, 40, 0, 0, 95
      )
      
      expect(result.success).toBe(1)
      
      const survey = mockBiodiversityContract.getSurvey(1)
      expect(survey.invasiveSpecies).toBe(0)
    })
  })
  
  describe('add-species-observation', () => {
    beforeEach(() => {
      mockBiodiversityContract.conductSurvey(
          'Test Forest', 30, 20, 3, 7, 80
      )
    })
    
    it('should successfully add species observation', () => {
      const result = mockBiodiversityContract.addSpeciesObservation(
          1, // survey-id
          'Robin',
          mockBiodiversityContract.CATEGORY_BIRDS,
          15, // population-count
          85, // health-status
          true // native
      )
      
      expect(result.success).toBe(1)
      expect(mockBiodiversityContract.getObservationCount()).toBe(1)
      
      const observation = mockBiodiversityContract.getObservation(1)
      expect(observation.speciesName).toBe('Robin')
      expect(observation.category).toBe(1)
      expect(observation.native).toBe(true)
    })
    
    it('should add observations for different species categories', () => {
      const species = [
        { name: 'Cardinal', category: mockBiodiversityContract.CATEGORY_BIRDS },
        { name: 'Butterfly', category: mockBiodiversityContract.CATEGORY_INSECTS },
        { name: 'Oak Tree', category: mockBiodiversityContract.CATEGORY_PLANTS },
        { name: 'Squirrel', category: mockBiodiversityContract.CATEGORY_MAMMALS },
        { name: 'Trout', category: mockBiodiversityContract.CATEGORY_AQUATIC }
      ]
      
      species.forEach(({ name, category }, index) => {
        const result = mockBiodiversityContract.addSpeciesObservation(
            1, name, category, 10, 80, true
        )
        expect(result.success).toBe(index + 1)
      })
      
      expect(mockBiodiversityContract.getObservationCount()).toBe(5)
    })
    
    it('should reject observation for non-existent survey', () => {
      const result = mockBiodiversityContract.addSpeciesObservation(
          999, 'Test Species', 1, 10, 80, true
      )
      
      expect(result.error).toBe('ERR_SURVEY_NOT_FOUND')
    })
    
    it('should reject observation with invalid category', () => {
      const result = mockBiodiversityContract.addSpeciesObservation(
          1, 'Test Species', 99, 10, 80, true
      )
      
      expect(result.error).toBe('ERR_INVALID_DATA')
    })
    
    it('should reject observation with invalid health status', () => {
      const result = mockBiodiversityContract.addSpeciesObservation(
          1, 'Test Species', 1, 10, 150, true
      )
      
      expect(result.error).toBe('ERR_INVALID_DATA')
    })
  })
  
  describe('verify-survey', () => {
    beforeEach(() => {
      mockBiodiversityContract.conductSurvey(
          'Test Location', 25, 18, 2, 5, 75
      )
    })
    
    it('should successfully verify survey', () => {
      const result = mockBiodiversityContract.verifySurvey(1)
      
      expect(result.success).toBe(true)
      
      const survey = mockBiodiversityContract.getSurvey(1)
      expect(survey.verified).toBe(true)
    })
    
    it('should reject verification of non-existent survey', () => {
      const result = mockBiodiversityContract.verifySurvey(999)
      
      expect(result.error).toBe('ERR_SURVEY_NOT_FOUND')
    })
  })
  
  describe('calculate-biodiversity-index', () => {
    beforeEach(() => {
      mockBiodiversityContract.conductSurvey(
          'Test Ecosystem', 50, 30, 5, 15, 80
      )
    })
    
    it('should calculate correct biodiversity index', () => {
      const result = mockBiodiversityContract.calculateBiodiversityIndex(1)
      
      // Native ratio: (30/50) * 100 = 60
      // Habitat score: 80
      // Threat penalty: 15
      // Index: (60 + 80 + (100 - 15)) / 3 = 75
      expect(result.success).toBe(75)
    })
    
    it('should handle perfect biodiversity scenario', () => {
      mockBiodiversityContract.conductSurvey(
          'Perfect Ecosystem', 40, 40, 0, 0, 100
      )
      
      const result = mockBiodiversityContract.calculateBiodiversityIndex(2)
      
      // Native ratio: 100, Habitat: 100, Threat penalty: 0
      // Index: (100 + 100 + 100) / 3 = 100
      expect(result.success).toBe(100)
    })
    
    it('should handle degraded ecosystem', () => {
      mockBiodiversityContract.conductSurvey(
          'Degraded Area', 20, 5, 0, 15, 30
      )
      
      const result = mockBiodiversityContract.calculateBiodiversityIndex(2)
      
      // Native ratio: (5/20) * 100 = 25
      // Habitat score: 30
      // Threat penalty: 15
      // Index: (25 + 30 + (100 - 15)) / 3 = 46
      expect(result.success).toBe(46)
    })
    
    it('should reject calculation for non-existent survey', () => {
      const result = mockBiodiversityContract.calculateBiodiversityIndex(999)
      
      expect(result.error).toBe('ERR_SURVEY_NOT_FOUND')
    })
  })
  
  describe('comprehensive biodiversity tracking', () => {
    it('should track multiple surveys and observations', () => {
      // Conduct multiple surveys
      const surveys = [
        { location: 'Forest A', data: [40, 30, 3, 7, 85] },
        { location: 'Wetland B', data: [25, 20, 2, 3, 90] },
        { location: 'Urban Park C', data: [15, 8, 1, 6, 60] }
      ]
      
      surveys.forEach(({ location, data }) => {
        const result = mockBiodiversityContract.conductSurvey(
            location, data[0], data[1], data[2], data[3], data[4]
        )
        expect(result.success).toBeTruthy()
      })
      
      expect(mockBiodiversityContract.getSurveyCount()).toBe(3)
      
      // Add observations to first survey
      const observations = [
        { name: 'Blue Jay', category: 1, count: 8, health: 90, native: true },
        { name: 'Monarch Butterfly', category: 2, count: 12, health: 85, native: true },
        { name: 'Invasive Vine', category: 3, count: 5, health: 95, native: false }
      ]
      
      observations.forEach(({ name, category, count, health, native }) => {
        const result = mockBiodiversityContract.addSpeciesObservation(
            1, name, category, count, health, native
        )
        expect(result.success).toBeTruthy()
      })
      
      expect(mockBiodiversityContract.getObservationCount()).toBe(3)
    })
    
    it('should maintain data integrity across surveys and observations', () => {
      // Create survey
      const surveyResult = mockBiodiversityContract.conductSurvey(
          'Comprehensive Study Site', 35, 25, 3, 7, 78
      )
      expect(surveyResult.success).toBe(1)
      
      // Add detailed observations
      const detailedObservations = [
        { name: 'Red-winged Blackbird', category: 1, count: 6, health: 88, native: true },
        { name: 'Honeybee', category: 2, count: 50, health: 82, native: true },
        { name: 'Native Wildflower', category: 3, count: 100, health: 90, native: true },
        { name: 'White-tailed Deer', category: 4, count: 3, health: 85, native: true },
        { name: 'Bass', category: 5, count: 12, health: 75, native: true }
      ]
      
      detailedObservations.forEach(({ name, category, count, health, native }, index) => {
        const result = mockBiodiversityContract.addSpeciesObservation(
            1, name, category, count, health, native
        )
        expect(result.success).toBe(index + 1)
        
        const observation = mockBiodiversityContract.getObservation(index + 1)
        expect(observation.surveyId).toBe(1)
        expect(observation.speciesName).toBe(name)
        expect(observation.category).toBe(category)
        expect(observation.populationCount).toBe(count)
        expect(observation.healthStatus).toBe(health)
        expect(observation.native).toBe(native)
      })
    })
  })
  
  describe('edge cases and boundary conditions', () => {
    it('should handle surveys with zero endangered species', () => {
      const result = mockBiodiversityContract.conductSurvey(
          'Stable Ecosystem', 30, 25, 0, 5, 85
      )
      
      expect(result.success).toBe(1)
      
      const survey = mockBiodiversityContract.getSurvey(1)
      expect(survey.endangeredSpecies).toBe(0)
    })
    
    it('should handle minimum and maximum habitat quality', () => {
      const result1 = mockBiodiversityContract.conductSurvey(
          'Degraded Site', 10, 5, 0, 5, 0
      )
      const result2 = mockBiodiversityContract.conductSurvey(
          'Pristine Site', 50, 50, 0, 0, 100
      )
      
      expect(result1.success).toBe(1)
      expect(result2.success).toBe(2)
    })
    
    it('should handle species observations with zero population', () => {
      mockBiodiversityContract.conductSurvey('Test Site', 20, 15, 2, 3, 70)
      
      const result = mockBiodiversityContract.addSpeciesObservation(
          1, 'Rare Species', 1, 0, 50, true
      )
      
      expect(result.success).toBe(1)
      
      const observation = mockBiodiversityContract.getObservation(1)
      expect(observation.populationCount).toBe(0)
    })
  })
})
