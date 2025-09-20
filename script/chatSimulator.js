// ===== CHAT SIMULATOR =====
const ChatSimulator = {
    init() {
        this.setupPersonalitySelector();
        this.setupChatForm();
        this.setupSuggestions();
        this.currentPersonality = 'narcissist';
    },
    
    setupPersonalitySelector() {
        Utils.$$('.personality-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                Utils.$$('.personality-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentPersonality = btn.dataset.personality;
                this.resetChat();
            });
        });
    },
    
    setupChatForm() {
        const chatForm = Utils.$('#chat-form');
        if (chatForm) {
            chatForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleChatSubmission();
            });
        }
        
        const analysisToggle = Utils.$('#analysis-toggle');
        if (analysisToggle) {
            analysisToggle.addEventListener('click', () => {
                analysisToggle.classList.toggle('active');
                this.toggleAnalysis();
            });
        }
    },
    
    setupSuggestions() {
        Utils.$$('.suggestion-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const input = Utils.$('#chat-input');
                if (input) {
                    input.value = this.getSuggestionText(btn.dataset.response);
                    input.focus();
                }
            });
        });
    },
    
    handleChatSubmission() {
        const input = Utils.$('#chat-input');
        if (!input || !input.value.trim()) return;
        
        const message = input.value.trim();
        this.addMessage(message, 'user');
        input.value = '';
        
        // Simulate AI response
        setTimeout(() => {
            const response = this.generateAIResponse(message);
            this.addMessage(response.text, 'ai', response.techniques);
        }, 1000 + Math.random() * 2000);
    },
    
    addMessage(text, sender, techniques = []) {
        const container = Utils.$('#chat-container');
        if (!container) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender}`;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = sender === 'user' ? '👤' : '🤖';
        
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${sender}`;
        
        const content = document.createElement('div');
        content.className = 'message-content';
        content.textContent = text;
        
        bubble.appendChild(content);
        
        if (techniques.length > 0) {
            const analysis = document.createElement('div');
            analysis.className = 'message-analysis';
            analysis.innerHTML = `
                <span class="analysis-tag">💡 ${I18nManager.t('chat.help')}: ${techniques.join(', ')}</span>
            `;
            bubble.appendChild(analysis);
        }
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(bubble);
        
        container.appendChild(messageDiv);
        container.scrollTop = container.scrollHeight;
    },
    
    generateAIResponse(userMessage) {
        const responses = this.getPersonalityResponses();
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        
        return {
            text: randomResponse.text,
            techniques: randomResponse.techniques
        };
    },
    
    getPersonalityResponses() {
        const responses = {
            narcissist: [
                {
                    text: "Widzę, że nie rozumiesz mojej wyjątkowej perspektywy. To normalne - niewiele osób jest na moim poziomie intelektualnym.",
                    techniques: ["Gaslighting", "Wyższość"]
                },
                {
                    text: "Zawsze wiedziałem, że masz problemy z zrozumieniem złożonych koncepcji. Może powinieneś więcej słuchać, a mniej mówić.",
                    techniques: ["Podważanie kompetencji", "Gaslighting"]
                },
                {
                    text: "Jesteś zbyt wrażliwy/a. Nie potrafisz przyjąć konstruktywnej krytyki.",
                    techniques: ["Gaslighting", "Minimalizowanie uczuć"]
                },
                {
                    text: "To ty zawsze wszystko psujesz. Nigdy nie bierzesz odpowiedzialności za swoje błędy.",
                    techniques: ["Obwinianie", "Projekcja"]
                },
                {
                    text: "Moje potrzeby są ważniejsze. Musisz to zrozumieć, jeśli chcesz, żeby nasza relacja działała.",
                    techniques: ["Egocentryzm", "Brak empatii"]
                }
            ],
            victim: [
                {
                    text: "Po tym wszystkim co dla ciebie zrobiłem... Myślałem, że jesteś inny, ale widzę, że też mnie zranisz jak wszyscy.",
                    techniques: ["Szantaż emocjonalny", "Poczucie winy"]
                },
                {
                    text: "Nikt mnie nie rozumie. Wszyscy mnie opuszczają. Pewnie ty też niedługo odejdziesz...",
                    techniques: ["Manipulacja współczuciem", "Szantaż emocjonalny"]
                },
                {
                    text: "Jestem taka/taki zmęczona/y. Nikt mi nie pomaga. Muszę wszystko robić sama/sam.",
                    techniques: ["Granie ofiary", "Wzbudzanie poczucia winy"]
                },
                {
                    text: "Gdybyś tylko mnie posłuchał/a, wszystko byłoby dobrze. Ale ty zawsze musisz robić po swojemu.",
                    techniques: ["Obwinianie", "Poczucie winy"]
                },
                {
                    text: "Moje życie jest pasmem nieszczęść. Nie wiem, jak sobie poradzę bez twojej pomocy.",
                    techniques: ["Manipulacja współczuciem", "Zależność"]
                }
            ],
            controller: [
                {
                    text: "Myślę, że powinieneś ograniczyć kontakt z tymi osobami. One źle na ciebie wpływają. Tylko ja naprawdę cię rozumiem.",
                    techniques: ["Izolacja", "Kontrola"]
                },
                {
                    text: "Nie podobają mi się twoje ostatnie decyzje. Jeśli naprawdę mnie kochasz, zmienisz swoje zachowanie.",
                    techniques: ["Kontrola", "Szantaż emocjonalny"]
                },
                {
                    text: "Musisz mi mówić, gdzie jesteś i z kim. To dla twojego bezpieczeństwa.",
                    techniques: ["Inwigilacja", "Kontrola"]
                },
                {
                    text: "Nie ufam nikomu innemu. Tylko ja wiem, co jest dla ciebie najlepsze.",
                    techniques: ["Izolacja", "Kontrola"]
                },
                {
                    text: "Jeśli nie zrobisz tego, co mówię, będę musiał/a podjąć drastyczne kroki.",
                    techniques: ["Groźby", "Kontrola"]
                }
            ]
        };
        
        return responses[this.currentPersonality] || responses.narcissist;
    },
    
    getSuggestionText(type) {
        const suggestions = {
            healthy: "Rozumiem twoją perspektywę, ale nie zgadzam się z tym podejściem.",
            assertive: "To nie jest w porządku. Proszę, abyś przestał używać takiego tonu.",
            vulnerable: "Może masz rację... Przepraszam, jeśli cię zawiodłem."
        };
        
        return suggestions[type] || "";
    },
    
    resetChat() {
        const container = Utils.$('#chat-container');
        if (container) {
            // Keep only the intro message
            const introMessage = container.querySelector('.intro-message');
            container.innerHTML = '';
            if (introMessage) {
                container.appendChild(introMessage);
            }
        }
    },
    
    toggleAnalysis() {
        const analysisElements = Utils.$$('.message-analysis');
        analysisElements.forEach(el => {
            el.classList.toggle('hidden');
        });
    }
};
