interface LoadingSpinnerProps {
  message?: string
}

export const LoadingSpinner = ({ message = "読み込み中..." }: LoadingSpinnerProps) => (
  <div className="min-h-screen flex items-center justify-center">
    {message}
  </div>
)