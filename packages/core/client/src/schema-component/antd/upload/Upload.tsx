import { DeleteOutlined, DownloadOutlined, InboxOutlined, LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import { connect, mapProps, mapReadPretty } from '@formily/react';
import { Upload as AntdUpload, Button, Progress, Space } from 'antd';
import cls from 'classnames';
import { saveAs } from 'file-saver';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import LightBox from 'react-image-lightbox';
import 'react-image-lightbox/style.css'; // This only needs to be imported once in your app
import { ReadPretty } from './ReadPretty';
import { isImage, toArr, toFileList, toItem, toValue, useUploadProps } from './shared';
import { useStyles } from './style';
import type { ComposedUpload, DraggerProps, DraggerV2Props, UploadProps } from './type';

export const Upload: ComposedUpload = connect(
  (props: UploadProps) => {
    return <AntdUpload {...useUploadProps(props)} />;
  },
  mapProps({
    value: 'fileList',
  }),
  mapReadPretty(ReadPretty.Upload),
);

Upload.Attachment = connect((props: UploadProps) => {
  const { disabled, multiple, value, onChange } = props;
  const [fileList, setFileList] = useState<any[]>([]);
  const [sync, setSync] = useState(true);
  const images = fileList;
  const [photoIndex, setPhotoIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const { t } = useTranslation();
  const uploadProps = useUploadProps({ ...props });
  const { wrapSSR, hashId, componentCls: prefixCls } = useStyles();

  useEffect(() => {
    if (sync) {
      setFileList(toFileList(value));
    }
  }, [value, sync]);

  return wrapSSR(
    <div>
      <div className={cls(`${prefixCls}-wrapper`, `${prefixCls}-picture-card-wrapper`, 'nb-upload', hashId)}>
        <div className={cls(`${prefixCls}-list`, `${prefixCls}-list-picture-card`)}>
          {fileList.map((file) => {
            const handleClick = (e) => {
              e.preventDefault();
              e.stopPropagation();
              const index = fileList.indexOf(file);
              if (isImage(file.extname)) {
                setVisible(true);
                setPhotoIndex(index);
              } else {
                saveAs(file.url, `${file.title}${file.extname}`);
              }
            };
            return (
              <div
                key={file.title}
                className={`${prefixCls}-list-picture-card-container ${prefixCls}-list-item-container`}
              >
                <div
                  className={cls(
                    `${prefixCls}-list-item`,
                    `${prefixCls}-list-item-done`,
                    `${prefixCls}-list-item-list-type-picture-card`,
                  )}
                >
                  <div className={`${prefixCls}-list-item-info`}>
                    <span className={`${prefixCls}-span`}>
                      <a
                        className={`${prefixCls}-list-item-thumbnail`}
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={handleClick}
                      >
                        {file.imageUrl && (
                          <img src={file.imageUrl} alt={file.title} className={`${prefixCls}-list-item-image`} />
                        )}
                      </a>
                      <a
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${prefixCls}-list-item-name`}
                        title={file.title}
                        href={file.url}
                        onClick={handleClick}
                      >
                        {file.status === 'uploading' ? t('Uploading') : file.title}
                      </a>
                    </span>
                  </div>
                  <span className={`${prefixCls}-list-item-actions`}>
                    <Space size={3}>
                      <Button
                        size={'small'}
                        type={'text'}
                        icon={<DownloadOutlined />}
                        onClick={() => {
                          saveAs(file.url, `${file.title}${file.extname}`);
                        }}
                      />
                      {!disabled && (
                        <Button
                          size={'small'}
                          type={'text'}
                          icon={<DeleteOutlined />}
                          onClick={() => {
                            setSync(false);
                            setFileList((prevFileList) => {
                              if (!multiple) {
                                onChange?.(null as any);
                                return [];
                              }
                              const index = prevFileList.indexOf(file);
                              prevFileList.splice(index, 1);
                              onChange?.(toValue([...prevFileList]));
                              return [...prevFileList];
                            });
                          }}
                        />
                      )}
                    </Space>
                  </span>
                  {file.status === 'uploading' && (
                    <div className={`${prefixCls}-list-item-progress`}>
                      <Progress strokeWidth={2} type={'line'} showInfo={false} percent={file.percent} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {!disabled && (multiple || toArr(value).length < 1) && (
            <div className={cls(`${prefixCls}-list-picture-card-container`, `${prefixCls}-list-item-container`)}>
              <AntdUpload
                {...uploadProps}
                disabled={disabled}
                multiple={multiple}
                listType={'picture-card'}
                fileList={fileList}
                onChange={(info) => {
                  setSync(false);
                  if (multiple) {
                    if (info.file.status === 'done') {
                      onChange?.(toValue(info.fileList));
                    }
                    setFileList(info.fileList.map(toItem));
                  } else {
                    if (info.file.status === 'done') {
                      // TODO(BUG): object 的联动有问题，不响应，折中的办法先置空再赋值
                      onChange?.(null as any);
                      onChange?.(info.file?.response?.data);
                    }
                    setFileList([toItem(info.file)]);
                  }
                }}
                showUploadList={false}
              >
                {!disabled && (multiple || toArr(value).length < 1) && (
                  <span>
                    <PlusOutlined />
                    <br /> {t('Upload')}
                  </span>
                )}
              </AntdUpload>
            </div>
          )}
        </div>
      </div>
      {/* 预览图片的弹框 */}
      {visible && (
        <LightBox
          // discourageDownloads={true}
          mainSrc={images[photoIndex]?.imageUrl}
          nextSrc={images[(photoIndex + 1) % images.length]?.imageUrl}
          prevSrc={images[(photoIndex + images.length - 1) % images.length]?.imageUrl}
          onCloseRequest={() => setVisible(false)}
          onMovePrevRequest={() => setPhotoIndex((photoIndex + images.length - 1) % images.length)}
          onMoveNextRequest={() => setPhotoIndex((photoIndex + 1) % images.length)}
          imageTitle={images[photoIndex]?.title}
          toolbarButtons={[
            <button
              key={'preview-img'}
              style={{ fontSize: 22, background: 'none', lineHeight: 1 }}
              type="button"
              aria-label="Zoom in"
              title="Zoom in"
              className="ril-zoom-in ril__toolbarItemChild ril__builtinButton"
              onClick={(e) => {
                e.preventDefault();
                const file = images[photoIndex];
                saveAs(file.url, `${file.title}${file.extname}`);
              }}
            >
              <DownloadOutlined />
            </button>,
          ]}
        />
      )}
    </div>,
  );
}, mapReadPretty(ReadPretty.File));

Upload.Dragger = connect(
  (props: DraggerProps) => {
    const { tipContent } = props;
    const { wrapSSR, hashId, componentCls: prefixCls } = useStyles();
    return wrapSSR(
      <div className={cls(`${prefixCls}-dragger`, hashId)}>
        <AntdUpload.Dragger {...useUploadProps(props)}>
          {tipContent}
          {props.children}
        </AntdUpload.Dragger>
      </div>,
    );
  },
  mapProps({
    value: 'fileList',
  }),
);

Upload.DraggerV2 = connect(
  (props: DraggerV2Props) => {
    const { t } = useTranslation();
    const defaultTitle = t('Click or drag file to this area to upload');
    const defaultSubTitle = t('Support for a single or bulk upload, file size should not exceed') + ` 10MB`;
    const { title = defaultTitle, subTitle = defaultSubTitle, useProps } = props;
    const extraProps: Record<string, any> = useProps?.() || {};
    const [loading, setLoading] = useState(false);
    const { wrapSSR, hashId, componentCls: prefixCls } = useStyles();

    const handleChange = (fileList: any[] = []) => {
      const { onChange } = extraProps;
      onChange?.(fileList);

      if (fileList.some((file) => file.status === 'uploading')) {
        setLoading(true);
      } else {
        setLoading(false);
      }
    };

    return wrapSSR(
      <div className={cls(`${prefixCls}-dragger`, hashId)}>
        <AntdUpload.Dragger {...useUploadProps({ ...props, ...extraProps, onChange: handleChange })}>
          <p className={`${prefixCls}-drag-icon`}>
            {loading ? <LoadingOutlined style={{ fontSize: 36 }} spin /> : <InboxOutlined />}
          </p>
          <p className={`${prefixCls}-text`}>{title}</p>
          <p className={`${prefixCls}-hint`}>{subTitle}</p>
        </AntdUpload.Dragger>
      </div>,
    );
  },
  mapProps({
    value: 'fileList',
  }),
);

export default Upload;
