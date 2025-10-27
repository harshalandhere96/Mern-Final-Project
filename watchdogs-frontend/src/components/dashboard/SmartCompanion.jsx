import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import api from '../../config/api';
import './SmartCompanion.css';

const SmartCompanion = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [conversationId, setConversationId] = useState(null);

  useEffect(() => {
    loadSuggestions();
    initializeConversation();
  }, []);

  const initializeConversation = async () => {
    try {
      const response = await api.post('/ai/conversation/start');
      setConversationId(response.data.conversationId);
      
      // Add welcome message
      const welcomeMessage = {
        id: Date.now(),
        type: 'ai',
        text: `Hello ${user?.name || 'traveler'}! 👋 I'm your AI travel companion. I can help you with safety tips, local recommendations, emergency assistance, and travel advice. What would you like to know?`,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    } catch (error) {
      console.error('Failed to initialize conversation:', error);
    }
  };

  const loadSuggestions = async () => {
    try {
      const response = await api.get('/ai/suggestions');
      setSuggestions(response.data.suggestions || [
        { icon: '🛡️', text: 'Safety tips for my location' },
        { icon: '🍽️', text: 'Best local restaurants' },
        { icon: '🚨', text: 'What to do in an emergency?' },
        { icon: '🗺️', text: 'Tourist attractions nearby' },
        { icon: '🚕', text: 'Safe transportation options' },
        { icon: '💊', text: 'Find nearby hospitals' }
      ]);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    }
  };

  const handleSendMessage = async (messageText = input) => {
    if (!messageText.trim() || loading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: messageText.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.post('/ai/chat', {
        message: messageText.trim(),
        conversationId,
        context: {
          userId: user?._id,
          location: user?.currentLocation,
          preferences: user?.preferences
        }
      });

      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        text: response.data.response,
        timestamp: new Date(),
        suggestions: response.data.suggestions || []
      };

      setMessages(prev => [...prev, aiMessage]);

      // Update conversation ID if needed
      if (response.data.conversationId) {
        setConversationId(response.data.conversationId);
      }

    } catch (error) {
      console.error('Failed to send message:', error);
      
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        text: 'I apologize, but I encountered an error. Please try again or rephrase your question.',
        timestamp: new Date(),
        isError: true
      };

      setMessages(prev => [...prev, errorMessage]);
      showNotification('Error', 'Failed to get AI response', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    handleSendMessage(suggestion.text);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearConversation = async () => {
    try {
      if (conversationId) {
        await api.delete(`/ai/conversation/${conversationId}`);
      }
      setMessages([]);
      setConversationId(null);
      initializeConversation();
      showNotification('Success', 'Conversation cleared', 'success');
    } catch (error) {
      console.error('Failed to clear conversation:', error);
    }
  };

  return (
    <div className="smart-companion">
      <div className="companion-header">
        <div className="header-info">
          <h2>🤖 AI Travel Companion</h2>
          <p>Ask me anything about your travel safety and destinations</p>
        </div>
        <button 
          className="clear-btn"
          onClick={clearConversation}
          disabled={messages.length === 0}
        >
          🗑️ Clear Chat
        </button>
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="suggestions-container">
          <h3>💡 Quick Questions</h3>
          <div className="suggestions-grid">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                className="suggestion-btn"
                onClick={() => handleSuggestionClick(suggestion)}
                disabled={loading}
              >
                <span className="suggestion-icon">{suggestion.icon}</span>
                <span className="suggestion-text">{suggestion.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="messages-container">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.type} ${message.isError ? 'error' : ''}`}
          >
            <div className="message-avatar">
              {message.type === 'user' ? '👤' : '🤖'}
            </div>
            <div className="message-content">
              <div className="message-text">{message.text}</div>
              <div className="message-time">
                {new Date(message.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
              {message.suggestions && message.suggestions.length > 0 && (
                <div className="follow-up-suggestions">
                  <p className="follow-up-label">You might also want to know:</p>
                  {message.suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      className="follow-up-btn"
                      onClick={() => handleSendMessage(suggestion)}
                      disabled={loading}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="message ai loading">
            <div className="message-avatar">🤖</div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="input-container">
        <div className="input-wrapper">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about your travel safety..."
            disabled={loading}
            rows={1}
            className="message-input"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!input.trim() || loading}
            className="send-btn"
          >
            {loading ? '⏳' : '📤'} Send
          </button>
        </div>
        <div className="input-hint">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
};

export default SmartCompanion;
