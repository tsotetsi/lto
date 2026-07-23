// frontend/components/TemplateGallery.tsx
import React, { useState, useEffect } from 'react';
import { Template } from '../types/template';
import axios from 'axios';

interface TemplateGalleryProps {
  onSelectTemplate: (template: Template) => void;
  selectedTemplate?: Template;
}

const TemplateGallery: React.FC<TemplateGalleryProps> = ({ 
  onSelectTemplate, 
  selectedTemplate 
}) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/templates`);
      const templatesData = response.data;
      setTemplates(templatesData);
      
      // Extract unique categories
      const uniqueCategories = [...new Set(templatesData.map((t: Template) => t.category))].filter((c): c is string => typeof c === 'string');
      setCategories(['all', ...uniqueCategories]);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter(t => t.category === selectedCategory);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Category Filter */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map(template => (
          <div
            key={template.id}
            onClick={() => onSelectTemplate(template)}
            className={`border rounded-lg overflow-hidden cursor-pointer transition-all hover:scale-[1.02] ${
              selectedTemplate?.id === template.id
                ? 'border-blue-500 border-2 shadow-lg shadow-blue-500/20'
                : 'border-gray-700 hover:border-gray-500'
            }`}
          >
            {/* Template Thumbnail Placeholder */}
            <div className="h-48 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl mb-2">{getTemplateIcon(template.category)}</div>
                <h3 className="text-xl font-bold">{template.name}</h3>
                <p className="text-gray-400 text-sm mt-2">{template.category}</p>
              </div>
            </div>
            
            {/* Template Info */}
            <div className="p-4 bg-gray-900">
              <h3 className="font-bold text-lg mb-2">{template.name}</h3>
              <p className="text-gray-400 text-sm mb-3">{template.description}</p>
              
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">
                  {template.is_free ? 'FREE' : 'PREMIUM'}
                </span>
                <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm">
                  Select
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📄</div>
          <h3 className="text-xl font-bold mb-2">No Templates Found</h3>
          <p className="text-gray-400">Try selecting a different category</p>
        </div>
      )}
    </div>
  );
};

const getTemplateIcon = (category: string) => {
  switch (category) {
    case 'professional': return '👔';
    case 'creative': return '🎨';
    case 'academic': return '📚';
    case 'minimal': return '⚪';
    default: return '📄';
  }
};

export default TemplateGallery;