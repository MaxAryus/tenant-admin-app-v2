import React, { useEffect, useState } from 'react';
import { 
  Search, 
  Plus, 
  Newspaper,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Trash2,
  Image as ImageIcon,
  RefreshCw
} from 'lucide-react';
import { useNews, NewsItem } from '../store/newsStore';
import { useCompany } from '../store/companyStore';
import CreateNewsModal from '../components/CreateNewsModal';

const NewsCard = ({ news, onDelete }: { news: NewsItem; onDelete: () => void }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <div className="flex justify-between items-start">
      <h3 className="text-lg font-medium text-gray-900">{news.title}</h3>
      <button
        onClick={onDelete}
        className="text-gray-400 hover:text-red-600 transition-colors"
      >
        <Trash2 size={18} />
      </button>
    </div>
    
    {news.image_url && (
      <div className="mt-4">
        <img
          src={news.image_url}
          alt={news.title}
          className="w-full h-48 object-cover rounded-lg"
        />
      </div>
    )}
    
    <p className="mt-4 text-gray-600 whitespace-pre-wrap">{news.message}</p>
    
    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4" />
        <span>{new Date(news.created_at).toLocaleDateString('de-DE')}</span>
      </div>
      {news.image_url && (
        <div className="flex items-center gap-1">
          <ImageIcon className="h-4 w-4" />
          <span>Mit Bild</span>
        </div>
      )}
    </div>
  </div>
);

const News = () => {
  const { 
    news,
    loading,
    error,
    searchTerm,
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    setSearchTerm,
    setCurrentPage,
    fetchNews,
    deleteNews
  } = useNews();
  const { company } = useCompany();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (company) {
      fetchNews();
    }
  }, [company, fetchNews]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNews(true);
    setRefreshing(false);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Sind Sie sicher, dass Sie diese Nachricht löschen möchten?')) {
      try {
        await deleteNews(id);
      } catch (error) {
        console.error('Error deleting news:', error);
      }
    }
  };

  if (loading && news.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800">
        Bitte wählen Sie zuerst ein Unternehmen aus.
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Neuigkeiten</h1>
          <p className="mt-1 text-sm text-gray-600">
            Verwalten Sie Ihre Firmennachrichten
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus size={20} />
            <span>Neue Nachricht</span>
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          type="text"
          placeholder="Nachrichten durchsuchen..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>

      <div className="space-y-6">
        {loading && news.length > 0 && (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        )}

        {news.length > 0 ? (
          <div className="grid gap-6">
            {news.map((item) => (
              <NewsCard 
                key={item.id} 
                news={item}
                onDelete={() => handleDelete(item.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Newspaper className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Keine Nachrichten gefunden</h3>
            <p className="mt-1 text-gray-500">
              {searchTerm
                ? 'Versuchen Sie es mit anderen Suchbegriffen'
                : 'Erstellen Sie Ihre erste Nachricht'}
            </p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-700 text-center sm:text-left">
              Zeige <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> bis{' '}
              <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalItems)}</span> von{' '}
              <span className="font-medium">{totalItems}</span> Einträgen
            </div>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
                <span className="hidden sm:inline">Zurück</span>
              </button>
              <span className="px-4 py-2 text-sm text-gray-700">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages}
                className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="hidden sm:inline">Weiter</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateNewsModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
};

export default News;