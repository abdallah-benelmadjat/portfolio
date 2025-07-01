document.addEventListener('DOMContentLoaded', () => {
    const chatContainer = document.getElementById('chat-container');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');

    sendBtn.addEventListener('click', () => {
        const userMessage = userInput.value;
        if (userMessage.trim() === '') return;

        addMessage('user', userMessage);
        userInput.value = '';

        // Simulate AI response
        setTimeout(() => {
            const aiResponse = getAIResponse(userMessage);
            addMessage('ai', aiResponse);
        }, 1000);
    });

    function addMessage(sender, message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('p-4', 'rounded-lg', sender === 'user' ? 'bg-blue-500' : 'bg-slate-300', sender === 'user' ? 'text-white' : 'text-slate-800', sender === 'user' ? 'self-end' : 'self-start');
        messageElement.innerText = message;
        chatContainer.appendChild(messageElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function getAIResponse(question) {
        const lowerCaseQuestion = question.toLowerCase();

        if (lowerCaseQuestion.includes('industry 4.0')) {
            return 'Industry 4.0 refers to the fourth industrial revolution, which involves the integration of smart technologies like AI, IoT, and automation into manufacturing processes.';
        } else if (lowerCaseQuestion.includes('benefits')) {
            return 'The benefits of Industry 4.0 include increased efficiency, reduced costs, improved product quality, and greater flexibility in manufacturing.';
        } else if (lowerCaseQuestion.includes('technologies')) {
            return 'Key technologies in Industry 4.0 include the Internet of Things (IoT), Artificial Intelligence (AI), Big Data and Analytics, Cloud Computing, and Additive Manufacturing.';
        }

        return "I'm sorry, I don't have information about that topic. Please ask me about Industry 4.0.";
    }
});
