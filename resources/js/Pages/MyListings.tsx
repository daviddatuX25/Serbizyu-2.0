import ProductExperience from './ProductExperience';
import type { HomeProps } from '../types';

export default function MyListings(props: HomeProps) {
    return <ProductExperience {...props} experience="foundation_v1" pageMode="listings" />;
}
