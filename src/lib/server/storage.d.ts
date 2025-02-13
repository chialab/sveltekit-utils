export interface StorageReader<T> {
	get(key: string): Promise<T | undefined>;
}
export interface StorageWriter<T> {
	set(key: string, value: T): Promise<void>;
	delete(key: string): Promise<void>;
}

export interface StorageReadWriter<T> extends StorageReader<T>, StorageWriter<T> {}
