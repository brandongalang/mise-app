import { render, screen } from '@testing-library/react'
import { Skeleton } from './Skeleton'

describe('Skeleton', () => {
    it('renders correctly', () => {
        render(<Skeleton className="test-class" />)
        const skeleton = screen.getByTestId('skeleton')
        expect(skeleton).toBeInTheDocument()
        expect(skeleton).toHaveClass('animate-pulse', 'bg-stone-200', 'test-class')
    })

    it('renders circle variant', () => {
        render(<Skeleton variant="circle" />)
        const skeleton = screen.getByTestId('skeleton')
        expect(skeleton).toHaveClass('rounded-full')
    })
})
