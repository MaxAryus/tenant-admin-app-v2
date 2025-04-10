import React, { useState } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';

interface Monitor {
  id: string;
  name: string;
  address: string;
  status: 'Active' | 'Inactive';
  link: string;
}

const mockData: Monitor[] = [
  { id: '1040-20-01', name: 'Monitor A', address: '123 Main Street', status: 'Active', link: 'dashboard.company.com/m1' },
  { id: '1040-34-10', name: 'Monitor B', address: '456 Oak Avenue', status: 'Active', link: 'dashboard.company.com/m2' },
  { id: '1150-44-03', name: 'Monitor C', address: '789 Pine Road', status: 'Active', link: 'dashboard.company.com/m3' },
];

const Monitors = () => {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Monitors</h1>
        <button className="bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-800 transition-colors">
          <Plus size={20} />
          <span>Add Monitor</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="mb-6 relative">
          <input
            type="text"
            placeholder="Search monitors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          <svg
            className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-4 font-medium">Name</th>
              <th className="text-left py-4 font-medium">Location</th>
              <th className="text-left py-4 font-medium">Status</th>
              <th className="text-left py-4 font-medium">URL</th>
              <th className="text-left py-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {mockData.map((monitor) => (
              <tr key={monitor.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-4">{monitor.name}</td>
                <td className="py-4">{monitor.address}</td>
                <td className="py-4">
                  <span className="px-3 py-1 rounded-full text-sm bg-emerald-100 text-emerald-700">
                    {monitor.status}
                  </span>
                </td>
                <td className="py-4 text-gray-500">{monitor.link}</td>
                <td className="py-4">
                  <div className="flex gap-2">
                    <button className="p-1 hover:text-emerald-600 transition-colors">
                      <Pencil size={18} />
                    </button>
                    <button className="p-1 hover:text-red-600 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex justify-between items-center text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <button className="p-1">&lt;</button>
            <span>Page 1 of 4</span>
            <button className="p-1">&gt;</button>
          </div>
          <div>7 items per page</div>
        </div>
      </div>
    </div>
  );
};

export default Monitors;