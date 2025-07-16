import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Info } from 'lucide-react'
import { getEvaluationIcon } from '@/components/ui/icons'
import { getAspectShortTitle } from '../../lib/utils/evaluation'
import type { AnalysisResult, EvaluationAxis } from '@/types/analysis'

interface AnalysisResultsProps {
  analysis: AnalysisResult
  onStatementClick: (aspect: EvaluationAxis, statement: any, index: number) => void
  parseAllStatements: (text: string) => string[]
  getAllStatements: () => any[]
  originalText: string
}

// ツールチップコンポーネント
const InfoTooltip = ({ children, content }: { children: React.ReactNode; content: string }) => {
  const [isVisible, setIsVisible] = useState(false)
  
  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className="absolute top-1/2 left-full transform -translate-y-1/2 ml-2 px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded border border-gray-200 shadow-sm z-10 w-64">
          {content}
          <div className="absolute top-1/2 right-full transform -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-100"></div>
        </div>
      )}
    </div>
  )
}

export const AnalysisResults = ({ 
  analysis, 
  onStatementClick, 
  getAllStatements 
}: AnalysisResultsProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          分析結果
          <InfoTooltip content="発言をクリックすると詳細を表示します。">
            <Info className="h-4 w-4 text-gray-500 cursor-help" />
          </InfoTooltip>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={Object.keys(analysis)[0]} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-auto">
            {Object.keys(analysis).map((aspect) => (
              <TabsTrigger 
                key={aspect} 
                value={aspect} 
                className="text-xs sm:text-sm px-1 sm:px-2 py-2 sm:py-3 whitespace-pre-line text-center leading-tight h-auto min-h-[3rem]"
              >
                <span className="block">
                  {getAspectShortTitle(aspect)}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
          {Object.keys(analysis).map((aspect) => {
            const allStatements = getAllStatements()
            
            return (
              <TabsContent key={aspect} value={aspect} className="mt-6">
                <div className="space-y-1">
                  {allStatements.length > 0 ? (
                    allStatements.map((statementData, index) => {
                      const evaluation = statementData.evaluations[aspect]
                      const hasEvaluation = !!evaluation
                      
                      return (
                        <div
                          key={index}
                          className={`p-4 rounded-lg transition-colors border ${
                            hasEvaluation 
                              ? 'bg-gray-50 hover:bg-gray-100 cursor-pointer border-transparent hover:border-gray-200' 
                              : 'bg-gray-25 border-gray-100 cursor-default'
                          }`}
                          onClick={() => hasEvaluation && onStatementClick(aspect as EvaluationAxis, evaluation, index)}
                        >
                          <div className="flex items-start space-x-3">
                            {hasEvaluation ? (
                              getEvaluationIcon(evaluation.icon || 'good')
                            ) : (
                              <div className="h-4 w-4 rounded-full bg-gray-300 mt-0.5"></div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 mb-2">
                                {statementData.statement}
                              </p>
                              {hasEvaluation && (
                                <div className="space-y-2">
                                 
                                  {evaluation.feedback && (
                                    <div>
                                      <p className="text-xs font-medium text-gray-500 mb-1">フィードバック</p>
                                      <p className="text-sm text-gray-700" dangerouslySetInnerHTML={{__html: evaluation.feedback.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}}></p>
                                    </div>
                                  )}
                                  {evaluation.suggestions && evaluation.suggestions.length > 0 && (
                                    <div>
                                      <p className="text-xs font-medium text-gray-500 mb-1">改善提案</p>
                                      <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
                                        {evaluation.suggestions.map((suggestion: string, idx: number) => (
                                          <li key={idx} dangerouslySetInnerHTML={{__html: suggestion.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}}></li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {!evaluation.evaluation && !evaluation.feedback && (
                                    <p className="text-sm text-gray-500">評価が見つかりません</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="p-6 text-center text-gray-500">
                      発言が見つかりません
                    </div>
                  )}
                </div>
              </TabsContent>
            )
          })}
        </Tabs>
      </CardContent>
    </Card>
  )
}