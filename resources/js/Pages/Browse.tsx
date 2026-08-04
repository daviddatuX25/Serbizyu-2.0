import ProductExperience from './ProductExperience';
import type { HomeProps } from '../types';

export default function Browse(props: HomeProps) {
    return <ProductExperience {...props} experience="foundation_v1" pageMode="browse" />;
}
