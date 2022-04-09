import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const getProducts = [...cart];
      const productSelected = getProducts.find(
        (product) => product.id === productId
      );
      const stockAmount = await api
        .get(`stock/${productId}`)
        .then((response) => response.data.amount);
      const currentAmount = productSelected ? productSelected.amount : 0;
      const amount = currentAmount + 1;

      if (amount > stockAmount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if (productSelected) {
        productSelected.amount = amount;
      } else {
        const pullProduct: Product = await api
          .get(`products/${productId}`)
          .then((response) => response.data);
        pullProduct.amount = amount;
        getProducts.push(pullProduct);
      }

      setCart(getProducts);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(getProducts));
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const cartProducts = [...cart];
      const productIndex = cartProducts.findIndex(
        (product) => product.id === productId
      );

      if (productIndex >= 0) {
        cartProducts.splice(productIndex, 1);
        setCart(cartProducts);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(cartProducts));
      } else {
        throw Error();
      }
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const getProductAmount: Stock = await api
        .get(`/stock/${productId}`)
        .then((result) => result.data);
      if (amount <= getProductAmount.amount && amount >= 1) {
        const products = [...cart];
        products.find((product) => {
          if (product.id === productId) {
            product.amount = amount;
            return true;
          }
          return false;
        });
        setCart(products);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(products));
      } else {
        toast.error("Quantidade solicitada fora de estoque");
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
