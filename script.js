class RecipeFinder {
    constructor() {
        this.searchInput = document.getElementById('search-input');
        this.categoryFilter = document.getElementById('category-filter');
        this.searchBtn = document.getElementById('search-btn');
        this.recipesContainer = document.getElementById('recipes-container');
        this.recipeModal = document.getElementById('recipe-modal');
        this.recipeDetailsContainer = document.getElementById('recipe-details-container');
        this.closeModalBtn = document.getElementById('close-modal-btn');
        this.photoUploadInput = document.getElementById('recipe-photo-upload');
        this.photoUploadBtn = document.getElementById('photo-upload-btn');

        this.API_BASE_URL = 'https://www.themealdb.com/api/json/v1/1';
        this.IMAGE_RECOGNITION_API = 'YOUR_IMAGE_RECOGNITION_API_KEY'; // Replace with actual API

        this.REGIONS = {
            'Africa': [
                'Moroccan', 'Egyptian', 'Ethiopian', 'Nigerian', 'Kenyan', 
                'Algerian', 'Tunisian', 'South African', 'Ghanaian', 'Senegalese',
                'Congolese', 'Cameroonian', 'Tanzanian', 'Ugandan', 'Rwandan'
            ],
            'Asia': ['Chinese', 'Japanese', 'Indian', 'Thai', 'Korean', 'Vietnamese', 'Malaysian', 'Filipino'],
            'Europe': ['French', 'Italian', 'Spanish', 'Greek', 'British', 'German', 'Portuguese', 'Russian'],
            'Americas': ['American', 'Mexican', 'Brazilian', 'Jamaican', 'Canadian', 'Peruvian', 'Cuban', 'Colombian'],
            'Oceania': ['Australian', 'New Zealand']
        };

        // Loading screen elements
        this.loadingScreen = document.querySelector('.loading-screen');
        this.loadingProgressBar = document.querySelector('.loading-progress-bar');
        this.loadingPercentage = document.querySelector('.loading-percentage');

        // Initialize loading state management
        this.initLoadingState();

        this.initEventListeners();
    }

    initLoadingState() {
        // Simulate initial app loading
        this.simulateInitialLoading();

        // Add loading state to critical async methods
        this.wrapMethodsWithLoading([
            'searchRecipes', 
            'showRecipeDetails', 
            'handlePhotoUpload'
        ]);
    }

    simulateInitialLoading() {
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 20;
            if (progress > 100) progress = 100;
            
            this.updateLoadingProgress(progress);

            if (progress >= 100) {
                clearInterval(interval);
                this.hideLoadingScreen();
            }
        }, 300);
    }

    updateLoadingProgress(progress) {
        if (this.loadingProgressBar) {
            this.loadingProgressBar.style.width = `${progress}%`;
        }
        if (this.loadingPercentage) {
            this.loadingPercentage.textContent = `${Math.round(progress)}%`;
        }
    }

    hideLoadingScreen() {
        if (this.loadingScreen) {
            this.loadingScreen.classList.add('hidden');
        }
    }

    wrapMethodsWithLoading(methodNames) {
        methodNames.forEach(methodName => {
            const originalMethod = this[methodName];
            this[methodName] = async function(...args) {
                try {
                    this.showLoadingIndicator();
                    return await originalMethod.apply(this, args);
                } catch (error) {
                    console.error(`Error in ${methodName}:`, error);
                    throw error;
                } finally {
                    this.hideLoadingIndicator();
                }
            };
        });
    }

    showLoadingIndicator() {
        // Optional: Add a small loading spinner or progress indicator
        const loadingSpinner = document.createElement('div');
        loadingSpinner.classList.add('method-loading-spinner');
        loadingSpinner.innerHTML = `
            <div class="spinner">
                <div class="bounce1"></div>
                <div class="bounce2"></div>
                <div class="bounce3"></div>
            </div>
        `;
        document.body.appendChild(loadingSpinner);
    }

    hideLoadingIndicator() {
        const spinner = document.querySelector('.method-loading-spinner');
        if (spinner) {
            spinner.remove();
        }
    }

    initEventListeners() {
        this.searchBtn.addEventListener('click', () => this.searchRecipes());
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchRecipes();
        });
        this.closeModalBtn.addEventListener('click', () => this.closeRecipeModal());
        
        // Photo Upload Functionality
        this.photoUploadBtn.addEventListener('click', () => this.photoUploadInput.click());
        this.photoUploadInput.addEventListener('change', (e) => this.handlePhotoUpload(e));
        this.searchInput.addEventListener('input', () => this.suggestRegions());
    }

    async searchRecipes() {
        const query = this.searchInput.value.trim();
        const category = this.categoryFilter.value;

        try {
            let response;
            if (query) {
                // Enhanced search to include area, cuisine, and ingredients
                response = await Promise.all([
                    fetch(`${this.API_BASE_URL}/search.php?s=${query}`),
                    fetch(`${this.API_BASE_URL}/filter.php?a=${query}`),
                    fetch(`${this.API_BASE_URL}/filter.php?c=${query}`),
                    fetch(`${this.API_BASE_URL}/filter.php?i=${query}`)
                ]);

                const [nameResults, areaResults, categoryResults, ingredientResults] = await Promise.all(
                    response.map(res => res.json())
                );

                const combinedMeals = [
                    ...(nameResults.meals || []),
                    ...(areaResults.meals || []),
                    ...(categoryResults.meals || []),
                    ...(ingredientResults.meals || [])
                ];

                // Remove duplicates
                const uniqueMeals = Array.from(new Set(combinedMeals.map(m => m.idMeal)))
                    .map(id => combinedMeals.find(m => m.idMeal === id));

                this.displayRecipes(uniqueMeals);
            } else if (category) {
                response = await fetch(`${this.API_BASE_URL}/filter.php?c=${category}`);
                const data = await response.json();
                this.displayRecipes(data.meals || []);
            } else {
                this.displayMessage('Please enter a search term or select a category');
            }
        } catch (error) {
            console.error('Error fetching recipes:', error);
            this.displayMessage('Failed to fetch recipes. Please try again.');
        }
    }

    suggestRegions() {
        const query = this.searchInput.value.toLowerCase();
        const suggestions = Object.entries(this.REGIONS)
            .flatMap(([region, cuisines]) => 
                cuisines.filter(cuisine => 
                    cuisine.toLowerCase().includes(query) || 
                    region.toLowerCase().includes(query)
                )
            );
        
        // Create a suggestions dropdown
        const suggestionsDropdown = document.getElementById('suggestions-dropdown');
        if (!suggestionsDropdown) {
            const dropdown = document.createElement('div');
            dropdown.id = 'suggestions-dropdown';
            dropdown.classList.add('suggestions-dropdown');
            this.searchInput.parentNode.insertBefore(dropdown, this.searchInput.nextSibling);
        }

        const dropdown = document.getElementById('suggestions-dropdown');
        dropdown.innerHTML = suggestions.length > 0 
            ? suggestions.map(suggestion => 
                `<div class="suggestion-item" onclick="recipeFinder.selectSuggestion('${suggestion}')">${suggestion}</div>`
            ).join('') 
            : '';
        
        dropdown.style.display = suggestions.length > 0 ? 'block' : 'none';
    }

    selectSuggestion(suggestion) {
        this.searchInput.value = suggestion;
        this.searchRecipes();
        document.getElementById('suggestions-dropdown').style.display = 'none';
    }

    handlePhotoUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    // Simulate image recognition (replace with actual API call)
                    const recognizedIngredients = await this.recognizeIngredients(e.target.result);
                    this.searchInput.value = recognizedIngredients.join(', ');
                    this.searchRecipes();
                } catch (error) {
                    console.error('Image recognition error:', error);
                    this.displayMessage('Failed to recognize ingredients. Please try again.');
                }
            };
            reader.readAsDataURL(file);
        }
    }

    async recognizeIngredients(imageData) {
        // Placeholder for image recognition API
        // In a real-world scenario, you would use a service like Google Cloud Vision, 
        // Clarifai, or a custom machine learning model
        const mockIngredients = ['chicken', 'tomato', 'onion'];
        return mockIngredients;
    }

    displayRecipes(meals) {
        if (!meals || meals.length === 0) {
            this.recipesContainer.innerHTML = '<p class="message">No recipes found.</p>';
            return;
        }

        this.recipesContainer.innerHTML = meals.map(meal => `
            <div class="recipe-card" data-id="${meal.idMeal}">
                <img src="${meal.strMealThumb}" alt="${meal.strMeal}">
                <div class="recipe-card-content">
                    <h3>${meal.strMeal}</h3>
                    <button onclick="recipeFinder.showRecipeDetails('${meal.idMeal}')">View Recipe</button>
                </div>
            </div>
        `).join('');
    }

    async showRecipeDetails(mealId) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/lookup.php?i=${mealId}`);
            const data = await response.json();
            const meal = data.meals[0];

            if (!meal) {
                this.displayMessage('Recipe details not found');
                return;
            }

            const ingredients = this.extractIngredients(meal);

            // Create a more responsive modal layout
            this.recipeDetailsContainer.innerHTML = `
                <div class="recipe-modal-wrapper">
                    <div class="recipe-header">
                        <button class="close-modal-btn" onclick="recipeFinder.closeRecipeModal()">&times;</button>
                        <img src="${meal.strMealThumb}" alt="${meal.strMeal}" class="recipe-header-image">
                        <h2>${meal.strMeal}</h2>
                    </div>
                    <div class="recipe-details">
                        <div class="recipe-ingredients">
                            <h3>Ingredients</h3>
                            <ul>
                                ${ingredients.map(ing => `<li>${ing}</li>`).join('')}
                            </ul>
                        </div>
                        <div class="recipe-instructions">
                            <h3>Instructions</h3>
                            <p>${meal.strInstructions}</p>
                        </div>
                        ${meal.strYoutube ? `
                            <div class="recipe-video">
                                <h3>Video Tutorial</h3>
                                <a href="${meal.strYoutube}" target="_blank" class="video-link">
                                    <i class="fab fa-youtube"></i> Watch on YouTube
                                </a>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;

            this.recipeModal.classList.remove('hidden');
            
            // Add touch-friendly close functionality
            const closeModalBtn = this.recipeModal.querySelector('.close-modal-btn');
            closeModalBtn.addEventListener('click', () => this.closeRecipeModal());
            
            // Optional: Close modal when clicking outside
            this.recipeModal.addEventListener('click', (e) => {
                if (e.target === this.recipeModal) {
                    this.closeRecipeModal();
                }
            });
        } catch (error) {
            console.error('Error fetching recipe details:', error);
            this.displayMessage('Failed to fetch recipe details');
        }
    }

    extractIngredients(meal) {
        const ingredients = [];
        for (let i = 1; i <= 20; i++) {
            const ingredient = meal[`strIngredient${i}`];
            const measure = meal[`strMeasure${i}`];
            
            if (ingredient && ingredient.trim() !== '') {
                ingredients.push(`${measure ? measure + ' ' : ''}${ingredient}`);
            }
        }
        return ingredients;
    }

    closeRecipeModal() {
        this.recipeModal.classList.add('hidden');
    }

    displayMessage(message) {
        this.recipesContainer.innerHTML = `<p class="message">${message}</p>`;
    }
}

// Initialize the app
const recipeFinder = new RecipeFinder();