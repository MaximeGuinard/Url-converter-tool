class URLAnalyzer {
    constructor() {
        this.analysisResults = new Map();
        this.recommendations = new Map();
    }

    analyzeUrls(urls) {
        this.analysisResults.clear();
        this.recommendations.clear();

        urls.forEach(url => {
            const analysis = this.analyzeUrl(url);
            this.analysisResults.set(url, analysis);
            
            analysis.issues.forEach(issue => {
                if (!this.recommendations.has(issue.id)) {
                    this.recommendations.set(issue.id, {
                        type: issue.type,
                        title: issue.title,
                        message: issue.message,
                        urls: new Set()
                    });
                }
                this.recommendations.get(issue.id).urls.add(url);
            });
        });

        return {
            recommendations: Array.from(this.recommendations.entries()),
            analysisResults: this.analysisResults
        };
    }

    analyzeUrl(url) {
        const issues = [];
        const cleanUrl = url.toLowerCase().trim();
        const segments = cleanUrl.split('/').filter(s => s);

        // Vérification de la longueur totale
        if (cleanUrl.length > 100) {
            issues.push({
                id: 'length',
                type: 'error',
                title: 'URL trop longue',
                message: 'L\'URL dépasse 100 caractères. Recommandation : gardez vos URLs sous 100 caractères pour une meilleure lisibilité et mémorisation'
            });
        }

        // Vérification de la profondeur
        if (segments.length > 3) {
            issues.push({
                id: 'depth',
                type: 'warning',
                title: 'Profondeur excessive',
                message: 'L\'URL contient plus de 3 niveaux de profondeur. Recommandation : limitez la structure à 3 niveaux maximum pour une meilleure navigation'
            });
        }

        // Vérification des segments
        segments.forEach((segment, index) => {
            // Longueur des segments
            if (segment.length > 20) {
                issues.push({
                    id: 'segment-length',
                    type: 'warning',
                    title: 'Segments trop longs',
                    message: 'Certains segments dépassent 20 caractères. Recommandation : utilisez des mots-clés courts et précis'
                });
            }

            // Nombres dans les segments (sauf dates)
            if (/\d+/.test(segment) && !this.isDateFormat(segment)) {
                issues.push({
                    id: 'numbers',
                    type: 'warning',
                    title: 'Nombres dans l\'URL',
                    message: 'Évitez les nombres dans les URLs sauf pour les dates. Utilisez des mots-clés descriptifs à la place'
                });
            }
        });

        // Vérification des mots de liaison
        const liaisons = ['et', 'and', 'ou', 'or', 'le', 'la', 'les', 'de', 'du', 'des'];
        if (liaisons.some(mot => segments.some(segment => segment.includes(mot)))) {
            issues.push({
                id: 'stop-words',
                type: 'warning',
                title: 'Mots de liaison',
                message: 'Évitez les mots de liaison (et, le, la, les, de, du, des...) dans les URLs. Utilisez des tirets pour séparer les mots-clés'
            });
        }

        // Vérification des tirets consécutifs
        if (/-{2,}/.test(cleanUrl)) {
            issues.push({
                id: 'consecutive-hyphens',
                type: 'error',
                title: 'Tirets consécutifs',
                message: 'Évitez les tirets consécutifs dans l\'URL. Utilisez un seul tiret pour séparer les mots'
            });
        }

        // Vérification des majuscules
        if (/[A-Z]/.test(url)) {
            issues.push({
                id: 'uppercase',
                type: 'warning',
                title: 'Lettres majuscules',
                message: 'Utilisez uniquement des lettres minuscules dans vos URLs pour une meilleure cohérence'
            });
        }

        // Vérification des extensions de fichier
        if (/\.(html|php|aspx?)$/.test(cleanUrl)) {
            issues.push({
                id: 'file-extensions',
                type: 'warning',
                title: 'Extensions de fichier',
                message: 'Évitez d\'inclure les extensions de fichier (.html, .php, etc.) dans vos URLs'
            });
        }

        // Vérification des paramètres d'URL
        if (url.includes('?') || url.includes('&')) {
            issues.push({
                id: 'query-parameters',
                type: 'warning',
                title: 'Paramètres d\'URL',
                message: 'Évitez les paramètres d\'URL pour le contenu principal. Utilisez des URLs propres et descriptives'
            });
        }

        // Vérification des underscores
        if (url.includes('_')) {
            issues.push({
                id: 'underscores',
                type: 'warning',
                title: 'Utilisation d\'underscores',
                message: 'Utilisez des tirets (-) au lieu des underscores (_) pour séparer les mots dans l\'URL'
            });
        }

        return { url, issues };
    }

    isDateFormat(segment) {
        // Vérifie si le segment correspond à un format de date (YYYY, YYYY-MM, YYYY-MM-DD)
        return /^(\d{4}(-\d{2})?(-\d{2})?)?$/.test(segment);
    }
}

class Modal {
    constructor() {
        this.modal = document.getElementById('urlModal');
        this.title = document.getElementById('modalTitle');
        this.message = document.getElementById('modalMessage');
        this.urlList = document.getElementById('modalUrlList');
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        const closeButton = this.modal.querySelector('.modal-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => this.close());
        }
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });
    }

    show(title, message, urls) {
        this.title.textContent = title;
        this.message.textContent = message;
        this.urlList.innerHTML = urls.map(url => `<li>${url}</li>`).join('');
        this.modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    close() {
        this.modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

class UIManager {
    constructor() {
        this.analyzer = new URLAnalyzer();
        this.modal = new Modal();
        this.setupEventListeners();
    }

    setupEventListeners() {
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (analyzeBtn) {
            // Supprime tous les écouteurs d'événements existants
            analyzeBtn.replaceWith(analyzeBtn.cloneNode(true));
            // Ajoute le nouvel écouteur
            document.getElementById('analyzeBtn').addEventListener('click', () => this.handleAnalysis());
        }
    }

    handleAnalysis() {
        const urlsInput = document.getElementById('originalUrls');
        if (!urlsInput) return;

        const urlsText = urlsInput.value;
        const urls = urlsText.split('\n')
            .map(url => url.trim())
            .filter(url => url);
        
        if (urls.length === 0) {
            this.displayRecommendations([]);
            return;
        }

        const analysis = this.analyzer.analyzeUrls(urls);
        this.displayRecommendations(analysis.recommendations);
    }

    displayRecommendations(recommendations) {
        const recsDiv = document.getElementById('recommendations');
        if (!recsDiv) return;

        recsDiv.innerHTML = '<h2>Recommandations SEO</h2>';
        
        if (recommendations.length === 0) {
            recsDiv.innerHTML += '<p class="no-issues">Aucun problème détecté dans les URLs !</p>';
            return;
        }
        
        const recommendationsContainer = document.createElement('div');
        recommendations.forEach(([id, rec]) => {
            const recElement = document.createElement('div');
            recElement.className = `recommendation-item ${rec.type}`;
            recElement.innerHTML = `
                <h3>
                    ${rec.title}
                    <span class="recommendation-count">${rec.urls.size}</span>
                </h3>
                <p>${rec.message}</p>
            `;
            
            recElement.addEventListener('click', () => {
                this.modal.show(rec.title, rec.message, Array.from(rec.urls));
            });
            
            recommendationsContainer.appendChild(recElement);
        });
        
        recsDiv.appendChild(recommendationsContainer);
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    new UIManager();
});