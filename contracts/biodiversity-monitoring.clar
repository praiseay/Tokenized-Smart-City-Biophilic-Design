;; Biodiversity Monitoring Contract
;; Monitors urban ecosystem health and species diversity

(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_UNAUTHORIZED (err u400))
(define-constant ERR_SURVEY_NOT_FOUND (err u401))
(define-constant ERR_INVALID_DATA (err u402))
(define-constant ERR_SPECIES_NOT_FOUND (err u403))

;; Species categories
(define-constant CATEGORY_BIRDS u1)
(define-constant CATEGORY_INSECTS u2)
(define-constant CATEGORY_PLANTS u3)
(define-constant CATEGORY_MAMMALS u4)
(define-constant CATEGORY_AQUATIC u5)

;; Biodiversity survey data structure
(define-map biodiversity-surveys
  { survey-id: uint }
  {
    location: (string-ascii 100),
    surveyor: principal,
    total-species: uint,
    native-species: uint,
    endangered-species: uint,
    invasive-species: uint,
    habitat-quality: uint,
    survey-date: uint,
    verified: bool
  }
)

;; Species observations
(define-map species-observations
  { observation-id: uint }
  {
    survey-id: uint,
    species-name: (string-ascii 50),
    category: uint,
    population-count: uint,
    health-status: uint,
    native: bool
  }
)

(define-map survey-counter { id: uint } { count: uint })
(define-map observation-counter { id: uint } { count: uint })

;; Initialize counters
(map-set survey-counter { id: u0 } { count: u0 })
(map-set observation-counter { id: u0 } { count: u0 })

;; Conduct biodiversity survey
(define-public (conduct-survey
  (location (string-ascii 100))
  (total-species uint)
  (native-species uint)
  (endangered-species uint)
  (invasive-species uint)
  (habitat-quality uint))
  (let ((survey-id (+ (get count (default-to { count: u0 } (map-get? survey-counter { id: u0 }))) u1)))

    (asserts! (>= total-species (+ native-species endangered-species invasive-species)) ERR_INVALID_DATA)
    (asserts! (and (>= habitat-quality u0) (<= habitat-quality u100)) ERR_INVALID_DATA)

    (map-set biodiversity-surveys
      { survey-id: survey-id }
      {
        location: location,
        surveyor: tx-sender,
        total-species: total-species,
        native-species: native-species,
        endangered-species: endangered-species,
        invasive-species: invasive-species,
        habitat-quality: habitat-quality,
        survey-date: block-height,
        verified: false
      }
    )

    (map-set survey-counter { id: u0 } { count: survey-id })
    (ok survey-id)
  )
)

;; Add species observation
(define-public (add-species-observation
  (survey-id uint)
  (species-name (string-ascii 50))
  (category uint)
  (population-count uint)
  (health-status uint)
  (native bool))
  (let ((observation-id (+ (get count (default-to { count: u0 } (map-get? observation-counter { id: u0 }))) u1)))

    (asserts! (is-some (map-get? biodiversity-surveys { survey-id: survey-id })) ERR_SURVEY_NOT_FOUND)
    (asserts! (and (>= category u1) (<= category u5)) ERR_INVALID_DATA)
    (asserts! (and (>= health-status u0) (<= health-status u100)) ERR_INVALID_DATA)

    (map-set species-observations
      { observation-id: observation-id }
      {
        survey-id: survey-id,
        species-name: species-name,
        category: category,
        population-count: population-count,
        health-status: health-status,
        native: native
      }
    )

    (map-set observation-counter { id: u0 } { count: observation-id })
    (ok observation-id)
  )
)

;; Verify survey
(define-public (verify-survey (survey-id uint))
  (let ((survey (unwrap! (map-get? biodiversity-surveys { survey-id: survey-id }) ERR_SURVEY_NOT_FOUND)))
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)

    (map-set biodiversity-surveys
      { survey-id: survey-id }
      (merge survey { verified: true })
    )
    (ok true)
  )
)

;; Get survey details
(define-read-only (get-survey (survey-id uint))
  (map-get? biodiversity-surveys { survey-id: survey-id })
)

;; Get species observation
(define-read-only (get-observation (observation-id uint))
  (map-get? species-observations { observation-id: observation-id })
)

;; Calculate biodiversity index
(define-read-only (calculate-biodiversity-index (survey-id uint))
  (match (map-get? biodiversity-surveys { survey-id: survey-id })
    survey (let ((native-ratio (/ (* (get native-species survey) u100) (get total-species survey)))
                 (habitat-score (get habitat-quality survey))
                 (threat-penalty (get invasive-species survey)))
             (ok (/ (+ native-ratio habitat-score (- u100 threat-penalty)) u3)))
    ERR_SURVEY_NOT_FOUND
  )
)

;; Get total surveys
(define-read-only (get-survey-count)
  (get count (default-to { count: u0 } (map-get? survey-counter { id: u0 })))
)

;; Get total observations
(define-read-only (get-observation-count)
  (get count (default-to { count: u0 } (map-get? observation-counter { id: u0 })))
)
