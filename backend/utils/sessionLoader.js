const fs = require('fs').promises;
const path = require('path');
const { SessionTemplateSchema } = require('./validation');

class SessionLoader {
  constructor() {
    this.sessionTemplate = null;
    this.isLoaded = false;
  }

  async loadSessionTemplate() {
    try {
      const templatePath = path.join(__dirname, '..', 'session_template.json');
      const templateData = await fs.readFile(templatePath, 'utf8');
      const parsedData = JSON.parse(templateData);
      
      // Validate with Zod
      const validatedData = SessionTemplateSchema.parse(parsedData);
      
      this.sessionTemplate = validatedData.session_template;
      this.isLoaded = true;
      
      console.log('✅ Session template loaded and validated successfully');
      console.log(`📋 Found ${this.sessionTemplate.activities.length} activities`);
      
      return this.sessionTemplate;
    } catch (error) {
      console.error('❌ Failed to load session template:', error.message);
      if (error.errors) {
        console.error('Validation errors:', error.errors);
      }
      throw error;
    }
  }

  getSessionTemplate() {
    if (!this.isLoaded) {
      throw new Error('Session template not loaded. Call loadSessionTemplate() first.');
    }
    return this.sessionTemplate;
  }

  getActivityById(activityId) {
    if (!this.isLoaded) {
      throw new Error('Session template not loaded');
    }
    return this.sessionTemplate.activities.find(activity => activity.id === activityId);
  }

  getActivitiesByType(type) {
    if (!this.isLoaded) {
      throw new Error('Session template not loaded');
    }
    return this.sessionTemplate.activities.filter(activity => activity.type === type);
  }
}

module.exports = new SessionLoader();
