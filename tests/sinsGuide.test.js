import { describe, it, expect, vi } from 'vitest';

// Mock I18nManager
const I18nManager = {
  t: vi.fn((key) => {
    const translations = {
      'guide.exampleLabel': 'Example',
      'guide.detectionTitle': 'How to detect:',
      'guide.sins.sin1.title': 'Sin 1 Title',
      'guide.sins.sin1.description': 'Sin 1 Description',
      'guide.sins.sin1.example': 'Sin 1 Example Text',
      'guide.sins.sin1.detection': ['Detection point 1'],
    };
    return translations[key] || key;
  }),
};

// Mock document.querySelector
const mockElement = { innerHTML: '' };
global.document = {
  querySelector: vi.fn((selector) => {
    if (selector === '.sins-grid') {
      return mockElement;
    }
    return null;
  }),
};

// The object under test, copied from script.js
const SinsGuide = {
  init() {
    const container = document.querySelector('.sins-grid');
    if (!container) return;

    this.generateSinsGrid();
  },

  generateSinsGrid() {
    const container = document.querySelector('.sins-grid');
    if (!container) return;

    const sins = [
      {
        title: I18nManager.t('guide.sins.sin1.title'),
        description: I18nManager.t('guide.sins.sin1.description'),
        example: I18nManager.t('guide.sins.sin1.example'),
        detection: I18nManager.t('guide.sins.sin1.detection'),
      },
    ];

    container.innerHTML = sins.map(sin => `
            <article class="sin-item">
                <h3 class="sin-title">${sin.title}</h3>
                <p class="sin-description">${sin.description}</p>
                <p class="sin-example"><strong>${I18nManager.t('guide.exampleLabel')}:</strong> ${sin.example}</p>
                <h4 class="sin-detection-title">${I18nManager.t('guide.detectionTitle')}</h4>
                <ul class="sin-detection-list">
                    ${sin.detection.map(item => `<li>${item}</li>`).join('')}
                </ul>
            </article>
        `).join('');
  },
};


describe('SinsGuide', () => {
  it('should generate the sins grid with the correct example label', () => {
    // Run the function to be tested
    SinsGuide.generateSinsGrid();

    // Check the result
    const expectedHTML = `
            <article class="sin-item">
                <h3 class="sin-title">Sin 1 Title</h3>
                <p class="sin-description">Sin 1 Description</p>
                <p class="sin-example"><strong>Example:</strong> Sin 1 Example Text</p>
                <h4 class="sin-detection-title">How to detect:</h4>
                <ul class="sin-detection-list">
                    <li>Detection point 1</li>
                </ul>
            </article>
        `;

    // Normalize whitespace for comparison
    const normalize = (str) => str.replace(/\s+/g, ' ').trim();
    expect(normalize(mockElement.innerHTML)).to.equal(normalize(expectedHTML));
  });
});
