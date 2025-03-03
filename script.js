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

        this.initEventListeners();
        this.initScrollAnimations();
        this.initInteractionSounds();
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
    }

    async searchRecipes() {
        const query = this.searchInput.value.trim();
        const category = this.categoryFilter.value;

        try {
            let response;
            if (query) {
                response = await fetch(`${this.API_BASE_URL}/search.php?s=${query}`);
            } else if (category) {
                response = await fetch(`${this.API_BASE_URL}/filter.php?c=${category}`);
            } else {
                this.displayMessage('Please enter a search term or select a category');
                return;
            }

            const data = await response.json();
            const meals = data.meals || [];

            this.displayRecipes(meals);
        } catch (error) {
            console.error('Error fetching recipes:', error);
            this.displayMessage('Failed to fetch recipes. Please try again.');
        }
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
            <div class="recipe-card reveal-on-scroll" data-id="${meal.idMeal}">
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

            this.recipeDetailsContainer.innerHTML = `
                <div class="recipe-header">
                    <h2>${meal.strMeal}</h2>
                    <img src="${meal.strMealThumb}" alt="${meal.strMeal}">
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
                            <a href="${meal.strYoutube}" 
                               target="_blank" 
                               rel="noopener noreferrer"
                               onclick="this.classList.add('clicked')"
                               onmouseover="this.classList.add('hover')"
                               onmouseout="this.classList.remove('hover')">
                                Watch on YouTube
                            </a>
                        </div>
                    ` : ''}
                </div>
            `;

            this.recipeModal.classList.remove('hidden');
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

    initScrollAnimations() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                } else {
                    entry.target.classList.remove('active');
                }
            });
        }, {
            threshold: 0.1
        });

        // Add reveal animations to specific elements
        const revealElements = document.querySelectorAll('.reveal-on-scroll');
        revealElements.forEach(el => observer.observe(el));

        // Parallax effect for hero section
        this.initParallaxEffect();
    }

    initParallaxEffect() {
        const heroSection = document.querySelector('.hero-section');
        
        window.addEventListener('scroll', () => {
            const scrollPosition = window.pageYOffset;
            heroSection.style.transform = `translateY(${scrollPosition * 0.5}px)`;
        });
    }

    initInteractionSounds() {
        const hoverElements = document.querySelectorAll('button, .recipe-card, a');
        const hoverSound = new Audio('hover-sound.mp3');
        const clickSound = new Audio('click-sound.mp3');

        hoverElements.forEach(el => {
            el.addEventListener('mouseenter', () => {
                hoverSound.currentTime = 0;
                hoverSound.play().catch(e => console.log('Sound play error:', e));
            });

            el.addEventListener('click', () => {
                clickSound.currentTime = 0;
                clickSound.play().catch(e => console.log('Sound play error:', e));
            });
        });
    }
}

// Initialize the app with additional interactions
document.addEventListener('DOMContentLoaded', () => {
    const recipeFinder = new RecipeFinder();
    
    // Add cursor trail effect
    const cursorTrail = document.createElement('div');
    cursorTrail.classList.add('cursor-trail');
    document.body.appendChild(cursorTrail);

    document.addEventListener('mousemove', (e) => {
        cursorTrail.style.left = `${e.clientX}px`;
        cursorTrail.style.top = `${e.clientY}px`;
    });
});