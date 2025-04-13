import React, { useState, useMemo, useEffect } from 'react';
import { Search, Calculator, Users, HelpCircle, Clock, Filter, Wallet, Plus, Minus, ArrowLeftRight, Trash2, X, Send, Check, XCircle } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import { mockItems } from './types';
import { ItemCard } from './components/ItemCard';
import { supabase } from './lib/supabase';

const STORAGE_KEY = 'yum-values-inventory';

interface SelectedItem {
  id: string;
  quantity: number;
}

interface TradeSide {
  items: SelectedItem[];
}

interface TradeRequest {
  id: string;
  created_at: string;
  left_items: SelectedItem[];
  right_items: SelectedItem[];
  status: 'pending' | 'accepted' | 'declined';
  created_by: string;
  target_profile: string;
  target_display_name: string;
}

function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [inventorySearchTerm, setInventorySearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [inventoryItems, setInventoryItems] = useState<{[key: string]: number}>(() => {
    const savedInventory = localStorage.getItem(STORAGE_KEY);
    return savedInventory ? JSON.parse(savedInventory) : {};
  });
  const [showHelp, setShowHelp] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [showTrading, setShowTrading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pets' | 'knives' | 'guns' | 'legendary' | 'ultimate' | 'uncommon' | 'rare' | 'epic' | 'mad' | 'mythical'>('all');
  const [tradeSides, setTradeSides] = useState<{
    left: TradeSide;
    right: TradeSide;
  }>({
    left: { items: [] },
    right: { items: [] }
  });
  const [activeTradeSelection, setActiveTradeSelection] = useState<'left' | 'right' | null>(null);
  const [targetProfile, setTargetProfile] = useState('');
  const [targetDisplayName, setTargetDisplayName] = useState('');
  const [pendingTrades, setPendingTrades] = useState<TradeRequest[]>([]);

  const lastUpdated = "April 10, 2025 9:13 PM EST";
  
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inventoryItems));
  }, [inventoryItems]);

  useEffect(() => {
    fetchPendingTrades();
  }, []);

  const fetchPendingTrades = async () => {
    const { data: trades, error } = await supabase
      .from('trade_requests')
      .select('*')
      .eq('status', 'pending');

    if (error) {
      toast.error('Failed to fetch pending trades');
      return;
    }

    setPendingTrades(trades);
  };

  const handleCreateTrade = async () => {
    if (!targetDisplayName) {
      toast.error('Please enter the target display name');
      return;
    }

    // Verify the user has enough items in their inventory
    for (const item of tradeSides.left.items) {
      const inventoryQuantity = inventoryItems[item.id] || 0;
      if (inventoryQuantity < item.quantity) {
        toast.error(`You don't have enough ${mockItems.find(i => i.id === item.id)?.name}`);
        return;
      }
    }

    const { error } = await supabase
      .from('trade_requests')
      .insert([{
        left_items: tradeSides.left.items,
        right_items: tradeSides.right.items,
        created_by: '2423594147', // Replace with actual user ID
        target_profile: targetDisplayName, // Use display name as profile
        target_display_name: targetDisplayName
      }]);

    if (error) {
      toast.error('Failed to create trade request');
      return;
    }

    // Remove items from inventory
    const newInventory = { ...inventoryItems };
    for (const item of tradeSides.left.items) {
      const currentQuantity = newInventory[item.id] || 0;
      if (currentQuantity - item.quantity <= 0) {
        delete newInventory[item.id];
      } else {
        newInventory[item.id] = currentQuantity - item.quantity;
      }
    }
    setInventoryItems(newInventory);

    toast.success('Trade request created successfully');
    setTradeSides({ left: { items: [] }, right: { items: [] } });
    setTargetProfile('');
    setTargetDisplayName('');
    fetchPendingTrades();
  };

  const handleAcceptTrade = async (trade: TradeRequest) => {
    // Add right side items to inventory
    const newInventory = { ...inventoryItems };
    for (const item of trade.right_items) {
      const currentQuantity = newInventory[item.id] || 0;
      newInventory[item.id] = currentQuantity + item.quantity;
    }
    setInventoryItems(newInventory);

    // Update trade status
    const { error } = await supabase
      .from('trade_requests')
      .update({ status: 'accepted' })
      .eq('id', trade.id);

    if (error) {
      toast.error('Failed to accept trade');
      return;
    }

    toast.success('Trade accepted successfully');
    fetchPendingTrades();
  };

  const handleDeclineTrade = async (trade: TradeRequest) => {
    // Return left side items to inventory
    const newInventory = { ...inventoryItems };
    for (const item of trade.left_items) {
      const currentQuantity = newInventory[item.id] || 0;
      newInventory[item.id] = currentQuantity + item.quantity;
    }
    setInventoryItems(newInventory);

    // Update trade status
    const { error } = await supabase
      .from('trade_requests')
      .update({ status: 'declined' })
      .eq('id', trade.id);

    if (error) {
      toast.error('Failed to decline trade');
      return;
    }

    toast.success('Trade declined successfully');
    fetchPendingTrades();
  };

  const handleFilterClick = (filter: typeof activeFilter) => {
    setActiveFilter(filter);
    setShowFilters(false);
  };

  const filteredItems = useMemo(() => {
    return mockItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const isCollector = item.rarity === 'Collector';
      const isLegendary = item.rarity === 'legendary';
      const isUltimate = item.rarity === 'ultimate';
      const isBasic = item.rarity === 'basic';
      const isUncommon = item.rarity === 'uncommon';
      const isRare = item.rarity === 'rare';
      const isEpic = item.rarity === 'epic';
      const isMad = item.rarity === 'mad';
      const isMythical = item.rarity === 'mythical';
      
      if (activeFilter === 'legendary') {
        return matchesSearch && isLegendary;
      }
      
      if (activeFilter === 'ultimate') {
        return matchesSearch && isUltimate;
      }

      if (activeFilter === 'basic') {
        return matchesSearch && isBasic;
      }

      if (activeFilter === 'uncommon') {
        return matchesSearch && isUncommon;
      }

      if (activeFilter === 'rare') {
        return matchesSearch && isRare;
      }

      if (activeFilter === 'epic') {
        return matchesSearch && isEpic;
      }

      if (activeFilter === 'mad') {
        return matchesSearch && isMad;
      }

      if (activeFilter === 'mythical') {
        return matchesSearch && isMythical;
      }
      
      if (activeFilter !== 'all' && !isCollector) return false;

      switch (activeFilter) {
        case 'pets':
          return matchesSearch && item.type === 'Pet';
        case 'knives':
          return matchesSearch && item.type === 'Knife';
        case 'guns':
          return matchesSearch && item.type === 'Gun';
        default:
          return matchesSearch;
      }
    });
  }, [searchTerm, activeFilter]);

  const filteredInventoryItems = useMemo(() => {
    return Object.entries(inventoryItems).filter(([id]) => {
      const item = mockItems.find(i => i.id === id);
      return item && item.name.toLowerCase().includes(inventorySearchTerm.toLowerCase());
    });
  }, [inventoryItems, inventorySearchTerm]);

  const totalValue = useMemo(() => {
    return selectedItems.reduce((sum, selectedItem) => {
      const item = mockItems.find(i => i.id === selectedItem.id);
      if (!item) return sum;
      const itemValue = typeof item.value === 'string' ? parseInt(item.value.replace(/[^0-9]/g, ''), 10) : item.value;
      return sum + (itemValue * selectedItem.quantity);
    }, 0);
  }, [selectedItems]);

  const inventoryValue = useMemo(() => {
    return Object.entries(inventoryItems).reduce((sum, [id, quantity]) => {
      const item = mockItems.find(i => i.id === id);
      if (!item) return sum;
      const itemValue = typeof item.value === 'string' ? parseInt(item.value.replace(/[^0-9]/g, ''), 10) : item.value;
      return sum + (itemValue * quantity);
    }, 0);
  }, [inventoryItems]);

  const calculateTradeValue = (items: SelectedItem[]) => {
    return items.reduce((sum, selectedItem) => {
      const item = mockItems.find(i => i.id === selectedItem.id);
      if (!item) return sum;
      const itemValue = typeof item.value === 'string' ? parseInt(item.value.replace(/[^0-9]/g, ''), 10) : item.value;
      return sum + (itemValue * selectedItem.quantity);
    }, 0);
  };

  const leftSideValue = calculateTradeValue(tradeSides.left.items);
  const rightSideValue = calculateTradeValue(tradeSides.right.items);
  const tradeDifference = Math.abs(leftSideValue - rightSideValue);

  const handleTradeItemClick = (id: string) => {
    if (!activeTradeSelection) return;
    
    const side = tradeSides[activeTradeSelection];
    const existingItem = side.items.find(item => item.id === id);
    
    if (existingItem) {
      setTradeSides({
        ...tradeSides,
        [activeTradeSelection]: {
          items: side.items.map(item => 
            item.id === id 
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        }
      });
    } else {
      setTradeSides({
        ...tradeSides,
        [activeTradeSelection]: {
          items: [...side.items, { id, quantity: 1 }]
        }
      });
    }
  };

  const updateTradeQuantity = (side: 'left' | 'right', id: string, delta: number) => {
    setTradeSides({
      ...tradeSides,
      [side]: {
        items: tradeSides[side].items.map(item => {
          if (item.id === id) {
            const newQuantity = Math.max(1, item.quantity + delta);
            return { ...item, quantity: newQuantity };
          }
          return item;
        })
      }
    });
  };

  const removeTradeItem = (side: 'left' | 'right', id: string) => {
    setTradeSides({
      ...tradeSides,
      [side]: {
        items: tradeSides[side].items.filter(item => item.id !== id)
      }
    });
  };

  const clearTradeSide = (side: 'left' | 'right') => {
    setTradeSides({
      ...tradeSides,
      [side]: { items: [] }
    });
  };

  const toggleItemSelection = (id: string) => {
    setSelectedItems(prev => {
      const existingItem = prev.find(item => item.id === id);
      if (existingItem) {
        return prev.filter(item => item.id !== id);
      }
      return [...prev, { id, quantity: 1 }];
    });
  };

  const updateSelectedQuantity = (id: string, delta: number) => {
    setSelectedItems(prev => {
      return prev.map(item => {
        if (item.id === id) {
          const newQuantity = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQuantity };
        }
        return item;
      });
    });
  };

  const updateInventoryQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      const newInventory = { ...inventoryItems };
      delete newInventory[id];
      setInventoryItems(newInventory);
    } else {
      setInventoryItems(prev => ({
        ...prev,
        [id]: quantity
      }));
    }
  };

  const deleteInventoryItem = (id: string) => {
    const newInventory = { ...inventoryItems };
    delete newInventory[id];
    setInventoryItems(newInventory);
  };

  const filterButtons = [
    { label: 'All Items', value: 'all', color: 'purple', bgColor: 'from-purple-600 to-purple-700' },
    { label: 'Mythical', value: 'mythical', color: 'indigo', bgColor: 'from-indigo-600 to-indigo-700' },
    { label: 'Mad', value: 'mad', color: 'red', bgColor: 'from-red-600 to-red-700' },
    { label: 'Ultimate', value: 'ultimate', color: 'black', bgColor: 'from-gray-700 to-gray-900' },
    { label: 'Legendary', value: 'legendary', color: 'orange', bgColor: 'from-orange-600 to-orange-700' },
    { label: 'Epic', value: 'epic', color: 'yellow', bgColor: 'from-yellow-600 to-yellow-700' },
    { label: 'Rare', value: 'rare', color: 'green', bgColor: 'from-green-600 to-green-700' },
    { label: 'Basic', value: 'uncommon', color: 'blue', bgColor: 'from-blue-600 to-blue-700' },
    { label: 'Pets', value: 'pets', color: 'purple', bgColor: 'from-purple-600 to-purple-700' },
    { label: 'Knives', value: 'knives', color: 'blue', bgColor: 'from-blue-600 to-blue-700' },
    { label: 'Guns', value: 'guns', color: 'green', bgColor: 'from-green-600 to-green-700' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black">
      <Toaster position="top-center" />
      
      {/* Total Value Display */}
      <div className="fixed top-0 left-0 right-0 bg-purple-900/80 backdrop-blur-sm z-50 border-b border-purple-500/30">
        <div className="max-w-7xl mx-auto px-4 py-2 flex justify-center items-center">
          <div className="text-xl font-flashy">
            <span className="text-purple-300">Inventory:</span>
            <span className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent ml-2">
              {formatValue(inventoryValue)}
            </span>
          </div>
        </div>
      </div>

      {/* Trading Side Panel */}
      <div className={`fixed left-0 top-0 h-full w-96 bg-gray-900/95 shadow-2xl border-r-2 border-purple-500/20 z-40 transform transition-transform duration-300 ${showTrading ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col pt-16">
          <div className="p-4 border-b border-purple-500/30">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-flashy text-purple-300">Trading Calculator</h3>
              <button
                onClick={() => {
                  setShowTrading(false);
                  setActiveTradeSelection(null);
                }}
                className="p-1 hover:bg-purple-800/50 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-purple-400" />
              </button>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setActiveTradeSelection('left')}
                className={`flex-1 px-3 py-1 rounded-full text-sm font-flashy transition-all duration-200 ${
                  activeTradeSelection === 'left'
                    ? 'bg-purple-500 text-white'
                    : 'bg-purple-900/50 text-purple-300 hover:bg-purple-800/50'
                }`}
              >
                Select Your Side
              </button>
              <button
                onClick={() => setActiveTradeSelection('right')}
                className={`flex-1 px-3 py-1 rounded-full text-sm font-flashy transition-all duration-200 ${
                  activeTradeSelection === 'right'
                    ? 'bg-purple-500 text-white'
                    : 'bg-purple-900/50 text-purple-300 hover:bg-purple-800/50'
                }`}
              >
                Select Their Side
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Target Display Name Input */}
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Enter their display name"
                value={targetDisplayName}
                onChange={(e) => setTargetDisplayName(e.target.value)}
                className="w-full px-4 py-2 bg-purple-900/30 rounded-lg border border-purple-500/30 text-white placeholder-purple-300"
              />
            </div>

            {/* Your Side */}
            <div className="bg-purple-900/30 p-4 rounded-lg border border-purple-500/30">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-purple-300 font-flashy">Your Side</h4>
                <div className="flex items-center gap-2">
                  <span className="text-purple-400 font-flashy">{formatValue(leftSideValue)}</span>
                  <button
                    onClick={() => clearTradeSide('left')}
                    className="p-1 hover:bg-purple-800/50 rounded-full transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-purple-400" />
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {tradeSides.left.items.map(item => {
                  const itemData = mockItems.find(i => i.id === item.id);
                  if (!itemData) return null;
                  return (
                    <div key={item.id} className="flex items-center gap-3 bg-purple-900/50 p-2 rounded-lg">
                      {itemData.imageUrl && (
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gradient-to-br from-gray-800 to-purple-900/30 flex-shrink-0">
                          <img
                            src={itemData.imageUrl}
                            alt={itemData.name}
                            className="w-full h-full object-contain p-1 animate-float"
                            loading="lazy"
                          />
                        </div>
                      )}
                      <div className="flex-1 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-purple-300 font-flashy">{itemData.name}</span>
                          <span className="text-sm text-purple-400">{formatValue(itemData.value)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateTradeQuantity('left', item.id, -1)}
                            className="p-1 hover:bg-purple-800/50 rounded-full transition-colors"
                          >
                            <Minus className="w-4 h-4 text-purple-400" />
                          </button>
                          <span className="text-purple-400 w-8 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateTradeQuantity('left', item.id, 1)}
                            className="p-1 hover:bg-purple-800/50 rounded-full transition-colors"
                          >
                            <Plus className="w-4 h-4 text-purple-400" />
                          </button>
                          <button
                            onClick={() => removeTradeItem('left', item.id)}
                            className="p-1 hover:bg-purple-800/50 rounded-full transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-purple-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Their Side */}
            <div className="bg-purple-900/30 p-4 rounded-lg border border-purple-500/30">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-purple-300 font-flashy">Their Side</h4>
                <div className="flex items-center gap-2">
                  <span className="text-purple-400 font-flashy">{formatValue(rightSideValue)}</span>
                  <button
                    onClick={() => clearTradeSide('right')}
                    className="p-1 hover:bg-purple-800/50 rounded-full transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-purple-400" />
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {tradeSides.right.items.map(item => {
                  const itemData = mockItems.find(i => i.id === item.id);
                  if (!itemData) return null;
                  return (
                    <div key={item.id} className="flex items-center gap-3 bg-purple-900/50 p-2 rounded-lg">
                      {itemData.imageUrl && (
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gradient-to-br from-gray-800 to-purple-900/30 flex-shrink-0">
                          <img
                            src={itemData.imageUrl}
                            alt={itemData.name}
                            className="w-full h-full object-contain p-1 animate-float"
                            loading="lazy"
                          />
                        </div>
                      )}
                      <div className="flex-1 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-purple-300 font-flashy">{itemData.name}</span>
                          <span className="text-sm text-purple-400">{formatValue(itemData.value)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateTradeQuantity('right', item.id, -1)}
                            className="p-1 hover:bg-purple-800/50 rounded-full transition-colors"
                          >
                            <Minus className="w-4 h-4 text-purple-400" />
                          </button>
                          <span className="text-purple-400 w-8 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateTradeQuantity('right', item.id, 1)}
                            className="p-1 hover:bg-purple-800/50 rounded-full transition-colors"
                          >
                            <Plus className="w-4 h-4 text-purple-400" />
                          </button>
                          <button
                            onClick={() => removeTradeItem('right', item.id)}
                            className="p-1 hover:bg-purple-800/50 rounded-full transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-purple-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Trade Summary and Actions */}
            <div className="bg-purple-900/30 p-4 rounded-lg border border-purple-500/30 space-y-4">
              <div className="text-purple-300 font-flashy">
                Trade Difference: <span className="text-purple-400">{formatValue(tradeDifference)}</span>
              </div>
              
              <button
                onClick={handleCreateTrade}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white font-flashy flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Create Trade Request
              </button>
            </div>

            {/* Pending Trades */}
            {pendingTrades.length > 0 && (
              <div className="bg-purple-900/30 p-4 rounded-lg border border-purple-500/30">
                <h4 className="text-purple-300 font-flashy mb-4">Pending Trades</h4>
                <div className="space-y-4">
                  {pendingTrades.map(trade => (
                    <div key={trade.id} className="bg-purple-900/50 p-4 rounded-lg space-y-4">
                      <div className="text-purple-300 font-flashy">
                        Trade with: {trade.target_display_name}
                      </div>
                      
                      {/* Your Items */}
                      <div className="space-y-2">
                        <div className="text-sm text-purple-400">Your Items:</div>
                        {trade.left_items.map((item: SelectedItem) => {
                          const itemData = mockItems.find(i => i.id === item.id);
                          if (!itemData) return null;
                          return (
                            <div key={item.id} className="flex items-center gap-2 bg-purple-900/30 p-2 rounded-lg">
                              {itemData.imageUrl && (
                                <div className="w-8 h-8 rounded-lg overflow-hidden bg-gradient-to-br from-gray-800 to-purple-900/30">
                                  <img
                                    src={itemData.imageUrl}
                                    alt={itemData.name}
                                    className="w-full h-full object-contain p-1 animate-float"
                                    loading="lazy"
                                  />
                                </div>
                              )}
                              <div className="flex-1">
                                <div className="text-sm text-purple-300">{itemData.name}</div>
                                <div className="text-xs text-purple-400">
                                  {item.quantity}x ({formatValue(itemData.value * item.quantity)})
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Their Items */}
                      <div className="space-y-2">
                        <div className="text-sm text-purple-400">Their Items:</div>
                        {trade.right_items.map((item: SelectedItem) => {
                          const itemData = mockItems.find(i => i.id === item.id);
                          if (!itemData) return null;
                          return (
                            <div key={item.id} className="flex items-center gap-2 bg-purple-900/30 p-2 rounded-lg">
                              {itemData.imageUrl && (
                                <div className="w-8 h-8 rounded-lg overflow-hidden bg-gradient-to-br from-gray-800 to-purple-900/30">
                                  <img
                                    src={itemData.imageUrl}
                                    alt={itemData.name}
                                    className="w-full h-full object-contain p-1 animate-float"
                                    loading="lazy"
                                  />
                                </div>
                              )}
                              <div className="flex-1">
                                <div className="text-sm text-purple-300">{itemData.name}</div>
                                <div className="text-xs text-purple-400">
                                  {item.quantity}x ({formatValue(itemData.value * item.quantity)})
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Trade Values */}
                      <div className="flex justify-between text-sm">
                        <div className="text-purple-400">
                          Your Value: {formatValue(calculateTradeValue(trade.left_items))}
                        </div>
                        <div className="text-purple-400">
                          Their Value: {formatValue(calculateTradeValue(trade.right_items))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleAcceptTrade(trade)}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded-lg text-white font-flashy flex items-center gap-1"
                        >
                          <Check className="w-4 h-4" />
                          Accept
                        </button>
                        <button
                          onClick={() => handleDeclineTrade(trade)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded-lg text-white font-flashy flex items-center gap-1"
                        >
                          <XCircle className="w-4 h-4" />
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Animated background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-32 h-16 bg-purple-500/20 rounded-full blur-xl opacity-30 animate-float"></div>
        <div className="absolute top-40 right-20 w-40 h-20 bg-blue-500/20 rounded-full blur-xl opacity-30 animate-float delay-1000"></div>
        <div className="absolute bottom-20 left-1/4 w-36 h-18 bg-pink-500/20 rounded-full blur-xl opacity-30 animate-float delay-2000"></div>
      </div>

      {/* Header */}
      <header className="bg-gradient-to-r from-purple-900 via-indigo-900 to-blue-900 shadow-2xl relative z-10 border-b-2 border-purple-500/20 mt-10">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center group">
              <div className="h-12 w-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg flex items-center justify-center transform group-hover:rotate-12 transition-transform duration-200 shadow-lg">
                <span className="text-white font-bold text-2xl font-flashy">Y</span>
              </div>
              <h1 className="ml-2 text-3xl font-flashy font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 hover:animate-wiggle">
                YUM Values
              </h1>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <a
                href="https://discord.gg/GWeme6srdr"
                target="_blank"
                rel="noopener noreferrer"
                className="relative group w-full sm:w-auto"
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full opacity-75 group-hover:opacity-100 blur transition duration-200"></div>
                <button className="relative w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full text-white font-flashy text-sm shadow-lg hover:shadow-xl transition-all duration-200 group-hover:scale-105">
                  Join Discord
                </button>
              </a>
              <div className="relative group w-full sm:w-auto">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full opacity-75  group-hover:opacity-100 blur transition duration-200"></div>
                <button
                  className="relative w-full sm:w-auto flex items-center justify-center px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-white font-flashy text-xs shadow-lg hover:shadow-xl transition-all duration-200 group-hover:scale-105"
                >
                  <Clock className="w-3 h-3 mr-1.5 animate-pulse" />
                  <span className="relative whitespace-nowrap">
                    Last Updated: {lastUpdated}
                    <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform duration-200"></span>
                  </span>
                </button>
              </div>
              <div className="relative w-full sm:w-auto">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-purple-300" />
                </div>
                <input
                  type="text"
                  placeholder="Search items..."
                  className="block w-full sm:w-64 pl-10 pr-3 py-2 border-2 border-purple-500/30 rounded-full leading-5 bg-purple-900/50 text-white placeholder-purple-300 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 font-flashy text-sm transition-all duration-200 hover:shadow-lg shadow-purple-500/50"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 transition-all duration-300 ${showTrading ? 'ml-96' : ''}`}>
        {/* Filter Button and Popup */}
        <div className="mb-6 relative">
          <div className="flex gap-4 flex-wrap">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-white font-flashy text-sm shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Filter className="w-4 h-4" />
              {activeFilter === 'all' ? 'Select Filter' : `Filter: ${filterButtons.find(b => b.value === activeFilter)?.label}`}
            </button>

            <button
              onClick={() => setShowInventory(!showInventory)}
              className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full text-white font-flashy text-sm shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Wallet className="w-4 h-4" />
              My Inventory ({Object.keys(inventoryItems).length} items)
            </button>

            <button
              onClick={() => {
                setShowTrading(!showTrading);
                setActiveTradeSelection(null);
              }}
              className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full text-white font-flashy text-sm shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
            >
              <ArrowLeftRight className="w-4 h-4" />
              Trading Calculator
            </button>
          </div>

          {showFilters && (
            <div className="absolute top-full left-0 right-0 sm:right-auto mt-2 p-4 bg-gray-900 rounded-xl shadow-xl border-2 border-purple-500/20 z-50 sm:min-w-[200px] max-h-[60vh] overflow-y-auto">
              <div className="grid gap-2">
                {filterButtons.map((button) => (
                  <button
                    key={button.value}
                    onClick={() => handleFilterClick(button.value as typeof activeFilter)}
                    className={`px-4 py-2 rounded-full font-flashy text-sm transition-all duration-200 ${
                      activeFilter === button.value
                        ? `bg-gradient-to-r ${button.bgColor} text-white shadow-lg`
                        : `bg-gradient-to-r ${button.bgColor} bg-opacity-75 text-white hover:bg-opacity-100 border border-${button.color}-500/30`
                    }`}
                  >
                    {button.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Inventory Sidebar */}
          {showInventory && (
            <div className="fixed top-0 right-0 w-96 h-full bg-gray-900/95 shadow-2xl border-l-2 border-purple-500/20 z-50 transform transition-transform duration-300 ease-in-out overflow-hidden">
              <div className="h-full flex flex-col">
                <div className="p-4 border-b border-purple-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-purple-400" />
                    <h3 className="text-lg font-flashy text-purple-300">My Inventory</h3>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm font-flashy text-purple-400">
                      Value: {formatValue(inventoryValue)}
                    </div>
                    <button
                      onClick={() => setShowInventory(false)}
                      className="p-1 hover:bg-purple-800/50 rounded-full transition-colors"
                    >
                      <X className="w-5 h-5 text-purple-400" />
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <div className="relative mb-4">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-purple-300" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search inventory..."
                      value={inventorySearchTerm}
                      onChange={(e) => setInventorySearchTerm(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border-2 border-purple-500/30 rounded-full leading-5 bg-purple-900/50 text-white placeholder-purple-300 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 font-flashy text-sm transition-all duration-200"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {filteredInventoryItems.map(([id, quantity]) => {
                    const item = mockItems.find(i => i.id === id);
                    if (!item) return null;
                    return (
                      <div key={id} className="flex items-center gap-4 bg-purple-900/30 p-3 rounded-lg border border-purple-500/20 hover:border-purple-500/40 transition-colors">
                        {item.imageUrl && (
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-gradient-to-br from-gray-800 to-purple-900/30 flex-shrink-0">
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-full h-full object-contain p-1 animate-float"
                              loading="lazy"
                            />
                          </div>
                        )}
                        <div className="flex-grow flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-purple-300 font-medium">{item.name}</span>
                            <span className="text-sm text-purple-400">Value: {formatValue(item.value)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateInventoryQuantity(id, quantity - 1)}
                              className="p-1.5 bg-purple-800/50 rounded-md hover:bg-purple-700/50 transition-colors"
                            >
                              <Minus className="w-4 h-4 text-purple-300" />
                            </button>
                            <span className="text-purple-300 w-8 text-center">{quantity}</span>
                            <button
                              onClick={() => updateInventoryQuantity(id, quantity + 1)}
                              className="p-1.5 bg-purple-800/50 rounded-md hover:bg-purple-700/50 transition-colors"
                            >
                              <Plus className="w-4 h-4 text-purple-300" />
                            </button>
                            <button
                              onClick={() => deleteInventoryItem(id)}
                              className="p-1.5 bg-red-800/50 rounded-md hover:bg-red-700/50 transition-colors ml-2"
                              title="Delete item"
                            >
                              <Trash2 className="w-4 h-4 text-red-300" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {filteredInventoryItems.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-purple-300 py-8">
                      <Wallet className="w-12 h-12 text-purple-400 mb-4 opacity-50" />
                      <p className="font-flashy">
                        {Object.keys(inventoryItems).length === 0 
                          ? "Your inventory is empty" 
                          : "No items match your search"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Calculator Section */}
          <div className="lg:w-1/3">
            <div className="sticky top-20 bg-gradient-to-br from-gray-900 to-purple-900/50 rounded-xl p-4 sm:p-6 shadow-xl border-2 border-purple-500/20 max-h-[calc(100vh-120px)] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Calculator className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400 mr-2" />
                  <h2 className="text-xl sm:text-2xl font-flashy font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">Value Calculator</h2>
                </div>
                <button
                  onClick={() => setShowHelp(!showHelp)}
                  className="p-2 rounded-full hover:bg-purple-800/50 transition-colors duration-200"
                  title="How to use the calculator"
                >
                  <HelpCircle className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400" />
                </button>
              </div>
              
              {showHelp && (
                <div className="mb-4 p-3 sm:p-4 bg-purple-900/30 rounded-lg border border-purple-500/30">
                  <h3 className="text-sm sm:text-base text-purple-300 font-bold mb-2">How to Use the Calculator:</h3>
                  <ul className="text-xs sm:text-sm text-purple-200 space-y-1 sm:space-y-2 list-disc list-inside">
                    <li>Click on any item card to add it to the calculator</li>
                    <li>Use + and - buttons to adjust quantities</li>
                    <li>Click the item again to remove it</li>
                    <li>The total value updates automatically</li>
                    <li>Use the search bar to find specific items</li>
                    <li>Use the filter buttons to show specific types of items</li>
                    <li>Click "Add to Inventory" to save items for later</li>
                  </ul>
                </div>
              )}
              
              <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                <div className="space-y-2">
                  {selectedItems.map(selectedItem => {
                    const item = mockItems.find(i => i.id === selectedItem.id);
                    if (!item) return null;
                    const itemValue = typeof item.value === 'string' ? parseInt(item.value.replace(/[^0-9]/g, ''), 10) : item.value;
                    return (
                      <div 
                        key={selectedItem.id}
                        className="flex items-center gap-3 bg-purple-900/50 p-2 rounded-lg border border-purple-500/30"
                      >
                        {item.imageUrl && (
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-gradient-to-br from-gray-800 to-purple-900/30 flex-shrink-0">
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-full h-full object-contain p-1 animate-float"
                              loading="lazy"
                            />
                          </div>
                        )}
                        <div className="flex-1 flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-purple-300 font-flashy">{item.name}</span>
                            <span className="text-sm text-purple-400">{formatValue(itemValue * selectedItem.quantity)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateSelectedQuantity(selectedItem.id, -1)}
                              className="p-1 hover:bg-purple-800/50 rounded-full transition-colors"
                            >
                              <Minus className="w-4 h-4 text-purple-400" />
                            </button>
                            <span className="text-purple-400 w-8 text-center">{selectedItem.quantity}</span>
                            <button
                              onClick={() => updateSelectedQuantity(selectedItem.id, 1)}
                              className="p-1 hover:bg-purple-800/50 rounded-full transition-colors"
                            >
                              <Plus className="w-4 h-4 text-purple-400" />
                            </button>
                            <button
                              onClick={() => toggleItemSelection(selectedItem.id)}
                              className="p-1 hover:bg-purple-800/50 rounded-full transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-purple-400" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-purple-500/30">
                <div className="text-lg sm:text-xl font-flashy font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 mb-4">
                  Total Value: {formatValue(totalValue)}
                </div>
                {selectedItems.length > 0 && (
                  <button
                    onClick={() => {
                      selectedItems.forEach(selectedItem => {
                        const currentQuantity = inventoryItems[selectedItem.id] || 0;
                        updateInventoryQuantity(selectedItem.id, currentQuantity + selectedItem.quantity);
                      });
                      setSelectedItems([]);
                      setShowInventory(true);
                    }}
                    className="w-full px-4 py-2 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full text-white font-flashy text-sm shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <Wallet className="w-4 h-4" />
                    Add to Inventory
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Items Grid */}
          <div className="lg:w-2/3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredItems.map(item => (
                <div 
                  key={item.id} 
                  className="transform hover:scale-105 transition-transform duration-200 hover:animate-float cursor-pointer"
                  onClick={() => {
                    if (showTrading && activeTradeSelection) {
                      handleTradeItemClick(item.id);
                    } else {
                      toggleItemSelection(item.id);
                    }
                  }}
                >
                  <ItemCard 
                    item={item} 
                    isSelected={
                      showTrading && activeTradeSelection
                        ? tradeSides[activeTradeSelection].items.some(i => i.id === item.id)
                        : selectedItems.some(si => si.id === item.id)
                    }
                  />
                </div>
              ))}
            </div>
            
            {filteredItems.length === 0 && (
              <div className="text-center py-8 sm:py-12">
                <p className="text-lg sm:text-xl text-purple-300 font-flashy animate-bounce">No items found matching your search!</p>
              </div>
            )}
          </div>
        </div>

        {/* Credits Section */}
        <div className="mt-8 sm:mt-12 bg-gradient-to-br from-gray-900 to-purple-900/50 rounded-xl p-4 sm:p-6 shadow-xl border-2 border-purple-500/20">
          <div className="flex items-center mb-4">
            <Users className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400 mr-2" />
            <h2 className="text-xl sm:text-2xl font-flashy font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">Credits</h2>
          </div>
          <div className="space-y-2 font-flashy text-sm sm:text-base text-purple-300">
            <p>• List maintained by <a href="https://www.roblox.com/users/2423594147/profile" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-200 transition-colors">Yum</a></p>
            <p>• Thanks to the TMMX trading community for helping out.</p>
            <p>• Special thanks to Cryptic, Padas, Jer and Fawn for the idea</p>
          </div>
        </div>
      </main>
    </div>
  );
}

function formatValue(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(3)}m`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toString();
}

export default App;