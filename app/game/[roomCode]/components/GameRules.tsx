'use client';

import { useState } from 'react';

interface GameRulesProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GameRules({ isOpen, onClose }: GameRulesProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'cards'>('overview');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">게임 방법</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'overview'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            게임 개요
          </button>
          <button
            onClick={() => setActiveTab('cards')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'cards'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            카드 타입
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-800 mb-2">✈️ 비행기 하이재킹 게임</h3>
                <p className="text-blue-700">
                  플레이어들은 다양한 승객 카드를 이용해 비행기에 탑승하고 점수를 획득하는 게임입니다.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-800">🎮 게임 진행 방식</h3>
                
                <div className="grid gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-2">1️⃣ 비행기 선택</h4>
                    <p className="text-gray-600">
                      각 플레이어는 탑승할 비행기를 선택합니다. 같은 비행기에 여러 명이 탑승할 수 있습니다.
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-2">2️⃣ 토론 시간</h4>
                    <p className="text-gray-600">
                      플레이어들은 서로 토론하며 전략을 세울 수 있습니다. 하지만 자신의 카드를 공개할 필요는 없습니다.
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-2">3️⃣ 카드 선택</h4>
                    <p className="text-gray-600">
                      각 플레이어는 자신의 카드 중 하나를 선택하여 비행기에 탑승합니다.
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-2">4️⃣ 결과 확인</h4>
                    <p className="text-gray-600">
                      각 비행기별로 탑승한 카드들에 따라 점수가 계산되고 결과가 공개됩니다.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-800">🏆 승리 조건</h3>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800">
                    여러 라운드를 진행한 후, 총 점수가 가장 높은 플레이어가 승리합니다!
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cards' && (
            <div className="space-y-6">
              <div className="grid gap-4">
                {/* 승객 */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                      <span className="text-white font-bold">👥</span>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-800">승객</h4>
                  </div>
                  <p className="text-gray-600 mb-2">일반적인 승객입니다.</p>
                  <div className="bg-blue-50 rounded p-2">
                    <strong className="text-blue-800">점수:</strong> 
                    <span className="text-blue-700"> 함께 탑승한 승객 수 × 2점</span>
                  </div>
                </div>

                {/* 하이재커 */}
                <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center mr-3">
                      <span className="text-white font-bold">🔫</span>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-800">하이재커</h4>
                  </div>
                  <p className="text-gray-600 mb-2">비행기를 하이재킹하려는 나쁜 놈입니다. 하이재킹 시 다른 승객(추종자 제외)은 점수를 얻지 못합니다.</p>
                  <div className="bg-red-100 rounded p-2 space-y-1">
                    <div>
                      <strong className="text-red-800">하이재킹 성공 시:</strong> 
                      <span className="text-red-700"> 함께 탑승한 승객 수 × 3점</span>
                    </div>
                    <div>
                      <strong className="text-red-800">추종자가 있을 경우:</strong> 
                      <span className="text-red-700"> 추종자 수 × 3점 차감</span>
                    </div>
                  </div>
                </div>

                {/* 추종자 */}
                <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mr-3">
                      <span className="text-white font-bold">👤</span>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-800">추종자</h4>
                  </div>
                  <p className="text-gray-600 mb-2">하이재커를 따르는 놈입니다. 같이 하이재킹하려했으나 짐이되서 하이재커한테 버려졌습니다.</p>
                  <div className="bg-purple-100 rounded p-2">
                    <strong className="text-purple-800">점수:</strong> 
                    <span className="text-purple-700"> 탑승한 비행기에 하이재커가 있을 경우 7점</span>
                  </div>
                </div>

                {/* 우는 애기 */}
                <div className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center mr-3">
                      <span className="text-white font-bold">👶</span>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-800">우는 애기</h4>
                  </div>
                  <p className="text-gray-600 mb-2">비행기에서 만났다면 최악입니다. 다른 사람의 수면을 방해하는 시끄러운 승객입니다.</p>
                  <div className="bg-orange-100 rounded p-2 space-y-1">
                    <div>
                      <strong className="text-orange-800">본인:</strong> 
                      <span className="text-orange-700"> 함께 탑승한 승객 수 × 2점</span>
                    </div>
                    <div>
                      <strong className="text-orange-800">다른 승객들:</strong> 
                      <span className="text-orange-700"> 각각 1점 차감</span>
                    </div>
                  </div>
                </div>

                {/* 연인 */}
                <div className="border border-pink-200 rounded-lg p-4 bg-pink-50">
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center mr-3">
                      <span className="text-white font-bold">💕</span>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-800">연인</h4>
                  </div>
                  <p className="text-gray-600 mb-2">지들끼리만 좋은 커플 승객입니다.</p>
                  <div className="bg-pink-100 rounded p-2 space-y-1">
                    <div>
                      <strong className="text-pink-800">기본 점수:</strong> 
                      <span className="text-pink-700"> 함께 탑승한 승객 수 × 2점</span>
                    </div>
                    <div>
                      <strong className="text-pink-800">추가 점수:</strong> 
                      <span className="text-pink-700"> 연인 수 × 1점 (본인을 제외한 연인이 함께 탑승한 경우)</span>
                    </div>
                  </div>
                </div>

                {/* 모태솔로 */}
                <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
                      <span className="text-white font-bold">😔</span>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-800">모태솔로</h4>
                  </div>
                  <p className="text-gray-600 mb-2">25살 일반 승객. 사람을 좋아하지만 커플은 싫어합니다.</p>
                  <div className="bg-green-100 rounded p-2 space-y-1">
                    <div>
                      <strong className="text-green-800">기본 점수:</strong> 
                      <span className="text-green-700"> 함께 탑승한 승객 수 × 3점</span>
                    </div>
                    <div>
                      <strong className="text-green-800">감점:</strong> 
                      <span className="text-green-700"> 연인 수 × 1점</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  <strong>참고:</strong> "함께 탑승한 승객 수"는 본인을 제외한 해당 비행기에 함께 탄 모든 승객 수를 의미합니다.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
} 