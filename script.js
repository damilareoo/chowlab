class RecipeFinder {
    constructor() {
        this.API_BASE_URL = 'https://www.themealdb.com/api/json/v1/1';
        this.MAX_RETRIES = 3;
        this.RETRY_DELAY = 1000;
        
        // Ensure DOM is fully loaded before initialization
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    initialize() {
        try {
            this.initializeDOMElements();
            this.setupEventListeners();
            this.setupNetworkStatusTracking();
            this.safeLoadInitialRecipes();
        } catch (error) {
            this.handleCriticalError('App initialization failed', error);
        }
    }

    initializeDOMElements() {
        const requiredElements = [
            { name: 'searchInput', selector: '#search-input' },
            { name: 'categoryFilter', selector: '#category-filter' },
            { name: 'searchBtn', selector: '#search-btn' },
            { name: 'recipesContainer', selector: '#recipes-container' },
            { name: 'photoUploadBtn', selector: '#photo-upload-btn' },
            { name: 'recipePhotoUpload', selector: '#recipe-photo-upload' }
        ];

        requiredElements.forEach(element => {
            this[element.name] = document.querySelector(element.selector);
            if (!this[element.name]) {
                throw new Error(`Element not found: ${element.selector}`);
            }
        });
    }

    setupEventListeners() {
        if (this.photoUploadBtn && this.recipePhotoUpload) {
            this.photoUploadBtn.addEventListener('click', () => this.recipePhotoUpload.click());
        }

        if (this.searchBtn) {
            this.searchBtn.addEventListener('click', () => this.searchRecipes());
        }

        if (this.searchInput) {
            this.searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.searchRecipes();
            });
        }

        if (this.recipePhotoUpload) {
            this.recipePhotoUpload.addEventListener('change', this.handlePhotoUpload.bind(this));
        }
    }

    handlePhotoUpload(event) {
        const file = event.target.files[0];
        if (file) {
            // Basic file type validation
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
            if (!allowedTypes.includes(file.type)) {
                this.showErrorMessage('Invalid file type. Please upload an image.');
                return;
            }

            // File size validation (5MB limit)
            if (file.size > 5 * 1024 * 1024) {
                this.showErrorMessage('File is too large. Maximum 5MB allowed.');
                return;
            }

            this.showErrorMessage('Photo upload coming soon! We\'re working on AI recipe recognition.');
        }
    }

    setupNetworkStatusTracking() {
        window.addEventListener('online', () => this.handleNetworkStatus(true));
        window.addEventListener('offline', () => this.handleNetworkStatus(false));
    }

    handleNetworkStatus(isOnline) {
        const existingBanner = document.querySelector('.network-status-banner');
        if (existingBanner) {
            existingBanner.remove();
        }

        if (!isOnline) {
            const networkBanner = document.createElement('div');
            networkBanner.classList.add('network-status-banner', 'network-offline');
            networkBanner.textContent = 'No internet connection. Please check your network.';
            document.body.appendChild(networkBanner);
        }
    }

    async safeLoadInitialRecipes() {
        try {
            await this.loadInitialRecipes();
        } catch (error) {
            console.error('Initial recipes load failed:', error);
            this.showErrorMessage('Unable to load initial recipes. Please refresh the page.');
        }
    }

    async loadInitialRecipes() {
        const initialCategories = ['Seafood', 'Vegetarian', 'Chicken'];
        const allInitialRecipes = [];

        for (const category of initialCategories) {
            try {
                const response = await this.fetchFromAPI(`${this.API_BASE_URL}/filter.php?c=${category}`);
                if (response?.meals) {
                    allInitialRecipes.push(...response.meals.slice(0, 3));
                }
            } catch (error) {
                console.warn(`Error loading ${category} recipes:`, error);
            }
        }

        this.displayRecipes(allInitialRecipes);
    }

    async fetchFromAPI(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API fetch error:', error);
            throw error;
        }
    }

    async searchRecipes() {
        const query = this.sanitizeInput(this.searchInput.value);
        const category = this.categoryFilter.value;

        if (!query && !category) {
            this.showErrorMessage('Please enter a recipe or select a category.');
            return;
        }

        try {
            const recipes = await this.fetchRecipes(query, category);
            this.displayRecipes(recipes);
        } catch (error) {
            this.handleSearchError(error);
        }
    }

    sanitizeInput(input) {
        // Prevent XSS and trim whitespace
        return input.replace(/[<>&"']/g, '').trim();
    }

    async fetchRecipes(query, category) {
        try {
            let recipes = [];
            if (query) {
                const [nameResults, ingredientResults] = await Promise.all([
                    this.fetchFromAPI(`${this.API_BASE_URL}/search.php?s=${query}`),
                    this.fetchFromAPI(`${this.API_BASE_URL}/filter.php?i=${query}`)
                ]);

                recipes = [
                    ...(nameResults?.meals || []),
                    ...(ingredientResults?.meals || [])
                ];
            } else if (category) {
                const categoryResults = await this.fetchFromAPI(`${this.API_BASE_URL}/filter.php?c=${category}`);
                recipes = categoryResults?.meals || [];
            }

            // Remove duplicates and limit results
            return Array.from(
                new Set(recipes.map(r => r.idMeal))
            )
            .map(id => recipes.find(r => r.idMeal === id))
            .slice(0, 12);
        } catch (error) {
            console.error('Recipe fetch error:', error);
            throw error;
        }
    }

    displayRecipes(recipes) {
        if (!this.recipesContainer) return;

        this.recipesContainer.innerHTML = '';
        
        if (!recipes || recipes.length === 0) {
            this.showErrorMessage('No recipes found. Try a different search.');
            return;
        }

        const fragment = document.createDocumentFragment();
        recipes.forEach(recipe => {
            const recipeCard = this.createRecipeCard(recipe);
            fragment.appendChild(recipeCard);
        });

        this.recipesContainer.appendChild(fragment);
    }

    createRecipeCard(recipe) {
        if (!recipe) return document.createElement('div');

        const card = document.createElement('div');
        card.classList.add('recipe-card');
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', `View ${recipe.strMeal} recipe`);
        
        card.innerHTML = `
            <img src="${recipe.strMealThumb}" alt="${recipe.strMeal}" loading="lazy">
            <div class="recipe-card-content">
                <h3>${this.truncateText(recipe.strMeal, 25)}</h3>
                <p>${recipe.strCategory || 'Unknown Category'}</p>
            </div>
        `;

        return card;
    }

    truncateText(text, length) {
        return text && text.length > length 
            ? text.substring(0, length) + '...' 
            : text || '';
    }

    showErrorMessage(message) {
        if (this.recipesContainer) {
            this.recipesContainer.innerHTML = `
                <div class="error-message" role="alert">
                    ${message}
                </div>
            `;
        }
    }

    handleSearchError(error) {
        console.error('Search error:', error);
        this.showErrorMessage(
            navigator.onLine 
                ? 'Unable to find recipes. Please try a different search.' 
                : 'No internet connection. Please check your network.'
        );
    }

    handleCriticalError(message, error) {
        console.error(message, error);
        if (document.body) {
            document.body.innerHTML = `
                <div class="critical-error">
                    <h1>Oops! Something went wrong</h1>
                    <p>${message}</p>
                    <button onclick="location.reload()">Reload App</button>
                </div>
            `;
        }
    }
}

// Safe initialization
try {
    const recipeFinder = new RecipeFinder();
} catch (error) {
    console.error('Failed to initialize RecipeFinder:', error);
}